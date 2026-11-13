import { describe, it, expect } from 'vitest';
import { extractMedicalValuesFromText } from '../server/services/medicalExtractor';

describe('Clinical Medical Value Extractor', () => {
  const sampleThyrocareReportText = `
Name: K Monitha(20Y/F)
Report Availability Summary
TEST DETAILS REPORT STATUS
FERRITIN Ready
NEW AAROGYAM BASIC WITH USTSH Ready
VITAMIN D TOTAL AND B12 COMBO Ready

Tests Outside Reference Range
Note: Please refer to the table below for tests outside reference range.
Test Name
Observed ValueUnitsBio. Ref. Interval.
COMPLETE HEMOGRAM
43.6
LYMPHOCYTE
20-40
%
DIABETES
85
AVERAGE BLOOD GLUCOSE (ABG)
90-120
mg/dL
LIPID
101
LDL CHOLESTEROL - DIRECT
< 100
mg/dL
LIVER
1.31
BILIRUBIN - TOTAL
0.3-1.2
mg/dL
RENAL
25.2
BUN / SR.CREATININE RATIO
9:1-23:1
Ratio
VITAMINS
28.5
25-OH VITAMIN D (TOTAL)
30-100
ng/mL
172
VITAMIN B-12
197-771
pg/mL
Disclaimer: The above listed is the summary of the parameters with values outside the BRI.

< 200mg/dL 178
PHOTOMETRYTOTAL CHOLESTEROL
40-60mg/dL 49
PHOTOMETRYHDL CHOLESTEROL - DIRECT
< 150mg/dL 131
PHOTOMETRYTRIGLYCERIDES

g/dL
 14.2
12.0-15.0
HEMOGLOBIN

ng/mL26.7E.C.L.I.AFERRITIN
13 - 150
μg/dL120.49PHOTOMETRYIRON
`;

  it('extracts exact uncorrupted laboratory values without altering numbers', async () => {
    const { extractedValues, summary } = await extractMedicalValuesFromText(
      sampleThyrocareReportText,
      'test-doc-id'
    );

    expect(extractedValues.length).toBeGreaterThan(0);

    // 1. Vitamin D must be exactly 28.5 ng/mL (NOT 12 from package heading)
    const vitD = extractedValues.find(v => v.name.includes('VITAMIN D'));
    expect(vitD).toBeDefined();
    expect(vitD?.value).toBe(28.5);
    expect(vitD?.unit).toBe('ng/mL');
    expect(vitD?.status).toBe('abnormal_low');

    // 2. Vitamin B-12 must be exactly 172 pg/mL
    const vitB12 = extractedValues.find(v => v.name.includes('B-12') || v.name.includes('B12'));
    expect(vitB12).toBeDefined();
    expect(vitB12?.value).toBe(172);
    expect(vitB12?.unit).toBe('pg/mL');
    expect(vitB12?.status).toBe('abnormal_low');

    // 3. LDL Cholesterol must be exactly 101 mg/dL
    const ldl = extractedValues.find(v => v.name.includes('LDL'));
    expect(ldl).toBeDefined();
    expect(ldl?.value).toBe(101);
    expect(ldl?.status).toBe('abnormal_high');

    // 4. Bilirubin Total must be exactly 1.31 mg/dL
    const bili = extractedValues.find(v => v.name.includes('BILIRUBIN - TOTAL'));
    expect(bili).toBeDefined();
    expect(bili?.value).toBe(1.31);
    expect(bili?.status).toBe('abnormal_high');

    // 5. Ferritin must be exactly 26.7 ng/mL
    const ferritin = extractedValues.find(v => v.name.includes('FERRITIN'));
    expect(ferritin).toBeDefined();
    expect(ferritin?.value).toBe(26.7);
    expect(ferritin?.status).toBe('normal');

    // 6. Hemoglobin must be exactly 14.2 g/dL
    const hb = extractedValues.find(v => v.name.includes('HEMOGLOBIN'));
    expect(hb).toBeDefined();
    expect(hb?.value).toBe(14.2);
    expect(hb?.status).toBe('normal');

    // 7. Total Cholesterol must be exactly 178 mg/dL
    const tc = extractedValues.find(v => v.name.includes('TOTAL CHOLESTEROL'));
    expect(tc).toBeDefined();
    expect(tc?.value).toBe(178);
    expect(tc?.status).toBe('normal');

    expect(summary).toContain('outside standard reference ranges');
  }, 20000);
});
