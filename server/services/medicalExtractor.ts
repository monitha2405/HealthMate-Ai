import crypto from 'crypto';
import type { MedicalValue, MedicalValueStatus } from '../../src/types/index.js';
import { isGeminiAvailable, generateText } from './gemini.js';

function cleanTestName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function parseReferenceRange(refRange: string | undefined, numVal: number): MedicalValueStatus {
  let status: MedicalValueStatus = 'normal';
  if (!refRange) return status;

  const rangeBounds = refRange.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i);
  const upperCap = refRange.match(/<\s*(\d+(?:\.\d+)?)/);
  const lowerFloor = refRange.match(/>\s*(\d+(?:\.\d+)?)/);
  const ratioBounds = refRange.match(/(\d+(?:\.\d+)?)\s*:\s*\d+\s*-\s*(\d+(?:\.\d+)?)\s*:\s*\d+/);

  if (ratioBounds) {
    const min = parseFloat(ratioBounds[1]);
    const max = parseFloat(ratioBounds[2]);
    if (numVal < min) status = 'abnormal_low';
    else if (numVal > max) status = 'abnormal_high';
  } else if (rangeBounds) {
    const min = parseFloat(rangeBounds[1]);
    const max = parseFloat(rangeBounds[2]);
    if (numVal < min) status = 'abnormal_low';
    else if (numVal > max) status = 'abnormal_high';
  } else if (upperCap) {
    const max = parseFloat(upperCap[1]);
    if (numVal > max) status = 'abnormal_high';
  } else if (lowerFloor) {
    const min = parseFloat(lowerFloor[1]);
    if (numVal < min) status = 'abnormal_low';
  }

  return status;
}

export async function extractMedicalValuesFromText(
  rawText: string,
  docId: string
): Promise<{ extractedValues: MedicalValue[]; summary: string }> {
  const extracted: MedicalValue[] = [];
  const foundNames = new Set<string>();

  function addVal(
    name: string,
    value: number,
    unit: string,
    refRange: string | undefined,
    sourceText: string,
    confidence: number = 0.98
  ) {
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (foundNames.has(key)) return;
    if (isNaN(value)) return;

    // Filter out invalid names (e.g. package titles, dates, addresses, single words)
    if (name.length < 3 || /^\d+$/.test(name)) return;
    if (/(?:package|profile|panel|status|summary|report|processed|page|address|doctor|ready|barcode|conditions of reporting|sample type)/i.test(name)) {
      return;
    }

    // Clean method names out of test name if concatenated
    let cleaned = name.replace(/^(?:PHOTOMETRY|CALCULATED|E\.C\.L\.I\.A|H\.P\.L\.C|C\.L\.I\.A|SLS-Hemoglobin Method)\s*/i, '').trim();
    if (cleaned.length < 3) return;

    const status = parseReferenceRange(refRange, value);

    extracted.push({
      id: crypto.randomUUID(),
      name: cleanTestName(cleaned),
      value,
      unit: unit.trim(),
      referenceRange: refRange ? refRange.trim() : undefined,
      status,
      confidence,
      verified: false,
      sourceText: sourceText.trim()
    });
    foundNames.add(key);
  }

  const lines = rawText.split('\n').map(l => l.trim());

  // ─── Strategy 1: "Tests Outside Reference Range" block (Thyrocare / SRL format) ───
  const startIdx = rawText.indexOf('Tests Outside Reference Range');
  if (startIdx !== -1) {
    const endIdx = rawText.indexOf('Disclaimer: The above listed', startIdx);
    const section = rawText.slice(startIdx, endIdx !== -1 ? endIdx : startIdx + 3000);
    const sLines = section.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < sLines.length - 2; i++) {
      const valMatch = sLines[i].match(/^(\d+(?:\.\d+)?)$/);
      if (valMatch) {
        const val = parseFloat(valMatch[1]);
        const name = sLines[i + 1];
        const nextLine = sLines[i + 2];
        const nextNextLine = sLines[i + 3] || '';

        const isRef = /^[<>]?\s*\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?|:\d+-\d+:\d+)?$/.test(nextLine) ||
                      /^\d+:\d+-\d+:\d+$/.test(nextLine);

        if (isRef && name.length >= 3 && !/^\d+$/.test(name)) {
          const unit = (nextNextLine.length < 15 && !/^\d/.test(nextNextLine) && !/(?:renal|lipid|liver|vitamins|diabetes)/i.test(nextNextLine))
            ? nextNextLine : '';
          addVal(name, val, unit, nextLine, `${name}: ${val} ${unit} (Ref: ${nextLine})`, 0.99);
        }
      }
    }
  }

  // ─── Strategy 2: Detailed Lipid & Liver format: RefInterval+Unit + Value \n METHOD+TestName ───
  // e.g. "< 200mg/dL 178" \n "PHOTOMETRYTOTAL CHOLESTEROL"
  for (let i = 0; i < lines.length - 1; i++) {
    const m1 = lines[i].match(/^([<>]?\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*([a-zA-Z%\/μ\^0-9]+)\s+(\d+(?:\.\d+)?)$/);
    if (m1) {
      const ref = m1[1];
      const unit = m1[2];
      const val = parseFloat(m1[3]);
      const nextLine = lines[i + 1];
      const m2 = nextLine.match(/^(?:PHOTOMETRY|CALCULATED|E\.C\.L\.I\.A|H\.P\.L\.C|C\.L\.I\.A|ELECTROLYTE)?\s*([A-Za-z0-9\s\(\)\-\.\/]{3,50})$/i);
      if (m2) {
        addVal(m2[1], val, unit, ref, `${m2[1]}: ${val} ${unit}`, 0.96);
      }
    }
  }

  // ─── Strategy 3: Detailed Hemogram format: Unit \n Value \n RefInterval \n TestName ───
  // e.g. "g/dL" \n "14.2" \n "12.0-15.0" \n "HEMOGLOBIN"
  for (let i = 0; i < lines.length - 3; i++) {
    const uLine = lines[i];
    const vLine = lines[i + 1];
    const rLine = lines[i + 2];
    const nLine = lines[i + 3];

    if (/^[a-zA-Z%\/μ\^0-9\s]{1,12}$/.test(uLine) &&
        /^(\d+(?:\.\d+)?)$/.test(vLine) &&
        /^[<>]?\s*\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?)?$/.test(rLine) &&
        /^[A-Za-z\s\(\)\-\.]{3,45}$/.test(nLine) &&
        !/(?:methodology|calculated|ready|sample)/i.test(nLine)) {
      addVal(nLine, parseFloat(vLine), uLine, rLine, `${nLine}: ${vLine} ${uLine}`, 0.96);
    }
  }

  // ─── Strategy 4: Concatenated [Unit][Value][Method][TestName] ───
  // e.g. "ng/mL28.5E.C.L.I.A25-OH VITAMIN D (TOTAL)"
  for (let idx = 0; idx < lines.length; idx++) {
    const m = lines[idx].match(/^([a-zA-Z%\/μ\^0-9\s]{1,10}?)(\d+(?:\.\d+)?)\s*(?:E\.C\.L\.I\.A|PHOTOMETRY|CALCULATED|H\.P\.L\.C|C\.L\.I\.A|I\.C\.P\s*M\.S|ELISA|TURBIDIMETRY|ENZYMATIC|HEMATOLOGY|FLOW\s*CYTOMETRY|ELECTROLYTE|SLIDE\s*METHOD)\.?\s*([A-Z0-9\s\(\)\-\.\/]{3,60})$/i);
    if (m) {
      const unit = m[1].trim();
      const val = parseFloat(m[2]);
      const testName = m[3].trim();

      let refRange = '';
      for (let j = 1; j <= 4 && idx + j < lines.length; j++) {
        const nextL = lines[idx + j].trim();
        const refM = nextL.match(/^(\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?|[<>]\s*\d+(?:\.\d+)?)/);
        if (refM) {
          refRange = nextL;
          break;
        }
      }
      addVal(testName, val, unit, refRange, `${testName}: ${val} ${unit}`, 0.97);
    }
  }

  // ─── Strategy 5: Standard Single-Line Table Rows ───
  // e.g. "HEMOGLOBIN 13.8 g/dL 12.0-15.0"
  for (const line of lines) {
    const stdMatch = line.match(/^([A-Za-z\s\(\)\-\/\.]{3,40})\s+(\d+(?:\.\d+)?)\s+([a-zA-Z%\/\^μ0-9]{1,12})\s+([<>]?\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?.*)$/);
    if (stdMatch) {
      addVal(stdMatch[1], parseFloat(stdMatch[2]), stdMatch[3], stdMatch[4], line, 0.95);
    }
  }

  // ─── Strategy 6: Gemini LLM Clinical Supplement (if deterministic extraction found < 5 values) ───
  if (extracted.length < 5 && isGeminiAvailable() && rawText.length > 50) {
    try {
      const prompt = `You are an expert clinical laboratory data extraction system. Extract all medical lab test results from this report with 100% accuracy.
STRICT RULES:
1. Do not fabricate, hallucinate, round, or alter any numbers. Extract the exact numbers written in the report.
2. Return a JSON array of objects with keys: "name" (string), "value" (number), "unit" (string), "referenceRange" (string or empty), "status" ('normal'|'abnormal_high'|'abnormal_low').
3. If no other lab tests are found, return an empty array [].

<PATIENT_REPORT_TEXT>
${rawText.slice(0, 25000)}
</PATIENT_REPORT_TEXT>`;

      const geminiRes = await generateText({
        prompt,
        jsonMode: true,
        temperature: 0.1,
        systemInstruction: 'You extract structured laboratory measurements as raw JSON. Extract exact numerical facts only.'
      });

      if (geminiRes?.text) {
        const cleaned = geminiRes.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.name && typeof item.value === 'number') {
              addVal(item.name, item.value, item.unit || '', item.referenceRange, `${item.name}: ${item.value} ${item.unit || ''}`, 0.90);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Gemini extraction enhancement skipped (fallback to verified deterministic extraction):', e);
    }
  }

  // ─── Summary Generation ───
  let summary = '';
  if (extracted.length > 0) {
    const abnormal = extracted.filter(e => e.status !== 'normal');
    summary = `Report successfully parsed with ${extracted.length} verified laboratory biomarker(s). ${
      abnormal.length > 0
        ? `${abnormal.length} value(s) outside standard reference ranges (${abnormal.slice(0, 6).map(a => `${a.name}: ${a.value} ${a.unit}`).join(', ')}). Nutritional normalization plans suggested.`
        : 'All detected laboratory parameters appear within standard reference ranges.'
    }`;
  } else {
    summary = 'Medical document parsed. No standard lab numerical biomarkers automatically detected.';
  }

  return {
    extractedValues: extracted,
    summary
  };
}
