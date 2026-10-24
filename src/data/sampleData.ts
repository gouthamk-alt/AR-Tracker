// Raw sample data simulating CSV feed with ~160 rows
export interface RawInspectionRow {
  Date: string;
  Inspector: string;
  Agency: string;
  Manager: string;
  Address: string;
  Type: string;
  Size: string;
  'Job ref': string;
  Status: string;
  Source: string;
  'To-do ID': string;
  'To-do updated': string;
  List: string;
  Link: string;
  'Raw title': string;
  Check: string;
  Note: string;
}

const SAMPLE_INSPECTORS = [
  'Natalia F',
  'NATALIA F', // case variation for normalisation demo
  'Daniel M',
  'Sarah K',
  'SARAH K',   // case variation
  'Marcus T',
  'Chloe W',
  'Liam S',
];

const SAMPLE_AGENCIES = [
  'Porter Matthews Metro',
  'porter matthews metro', // case variation for alias/normalisation demo
  'Ray White Perth',
  'LJ Hooker City Residential',
  'Acton | Belle Property',
  'Realmark Central',
  'Harcourts City Central',
  'Professionals Victoria Park',
];

const SAMPLE_MANAGERS = [
  'Emma Watson',
  'James Miller',
  'Liam Davis',
  'Sophie Taylor',
  'Oliver Brown',
  'Emily Wilson',
];

const SAMPLE_STREETS = [
  '14 Beaufort St, Perth WA 6000',
  '82 Stirling Hwy, Nedlands WA 6009',
  '25 Hay St, Subiaco WA 6008',
  '19 Canning Hwy, South Perth WA 6151',
  '102 Oxford St, Leederville WA 6007',
  '45 Albany Hwy, Victoria Park WA 6100',
  '78 Scarborough Beach Rd, Scarborough WA 6019',
  '33 Mounts Bay Rd, Crawley WA 6009',
  '120 St Georges Tce, Perth WA 6000',
  '55 Rokeby Rd, Subiaco WA 6008',
  '18 Angelo St, South Perth WA 6151',
  '64 Adelaide Tce, East Perth WA 6004',
  '91 Royal St, East Perth WA 6004',
  '112 Coode St, South Perth WA 6151',
  '27 Walcott St, Mount Lawley WA 6050',
  '58 Whatley Cres, Maylands WA 6051',
  '84 Railway Rd, Subiaco WA 6008',
  '41 Mill Point Rd, South Perth WA 6151',
  '90 Cambridge St, West Leederville WA 6007',
  '15 Newcastle St, Perth WA 6000',
  '204 Marine Tce, Fremantle WA 6160',
  '39 Queen Victoria St, Fremantle WA 6160',
  '73 South Tce, Fremantle WA 6160',
  '12 Bulwer St, Perth WA 6000',
  '60 Colin St, West Perth WA 6005',
];

const SAMPLE_SIZES = ['1X1', '2X1', '2X2', '3X1', '3X2', '4X2', '4X3', '5X3'];

const DATES_SAMPLE = [
  // October 2026 (including today Sat 24 Oct and yesterday Fri 23 Oct)
  'Thu 1 Oct 2026', 'Fri 2 Oct 2026', 'Mon 5 Oct 2026', 'Tue 6 Oct 2026', 'Wed 7 Oct 2026',
  'Thu 8 Oct 2026', 'Fri 9 Oct 2026', 'Mon 12 Oct 2026', 'Tue 13 Oct 2026', 'Wed 14 Oct 2026',
  'Thu 15 Oct 2026', 'Fri 16 Oct 2026', 'Mon 19 Oct 2026', 'Tue 20 Oct 2026', 'Wed 21 Oct 2026',
  'Thu 22 Oct 2026', 'Fri 23 Oct 2026', 'Sat 24 Oct 2026', 'Mon 26 Oct 2026', 'Tue 27 Oct 2026',
  'Wed 28 Oct 2026', 'Thu 29 Oct 2026', 'Fri 30 Oct 2026',
  // November 2026
  'Mon 2 Nov 2026', 'Tue 3 Nov 2026', 'Wed 4 Nov 2026', 'Thu 5 Nov 2026', 'Fri 6 Nov 2026',
  'Sat 7 Nov 2026', 'Mon 9 Nov 2026', 'Tue 10 Nov 2026', 'Wed 11 Nov 2026', 'Thu 12 Nov 2026',
  'Fri 13 Nov 2026', 'Sat 14 Nov 2026', 'Mon 16 Nov 2026', 'Fri 20 Nov 2026',
];

export function generateSampleData(): RawInspectionRow[] {
  const rows: RawInspectionRow[] = [];
  let idCounter = 84001;

  for (let i = 0; i < 165; i++) {
    const isRoutine = i % 4 === 0;
    const date = DATES_SAMPLE[i % DATES_SAMPLE.length];
    const inspector = SAMPLE_INSPECTORS[i % SAMPLE_INSPECTORS.length];
    const agency = SAMPLE_AGENCIES[(i * 3 + 1) % SAMPLE_AGENCIES.length];
    const address = SAMPLE_STREETS[(i * 2 + 3) % SAMPLE_STREETS.length];
    
    // Distribute types
    let type = 'PCR';
    if (isRoutine) {
      type = 'ROUTINE';
    } else {
      const typeRand = i % 7;
      if (typeRand === 0 || typeRand === 1) type = 'PCR';
      else if (typeRand === 2) type = 'PCR PHOTOS ONLY';
      else if (typeRand === 3) type = 'INVENTORY';
      else if (typeRand === 4) type = 'FINAL BOND';
      else if (typeRand === 5) type = ''; // blank type will default to PCR
      else type = 'PCR';
    }

    const source = isRoutine ? 'Routine' : 'Date list';
    const status = i % 5 === 0 ? 'Open' : 'Done';
    const size = isRoutine ? '' : SAMPLE_SIZES[i % SAMPLE_SIZES.length];
    const manager = isRoutine ? '' : SAMPLE_MANAGERS[i % SAMPLE_MANAGERS.length];
    const jobRef = isRoutine ? '' : `JOB-${1000 + (i % 80)}`;
    const todoId = String(idCounter++);
    
    // Add intentional check issues for data quality demonstration
    let check = '';
    let rawTitle = `${address} - ${type || 'PCR'}`;
    if (i === 12) {
      check = 'Check title';
      rawTitle = 'Incomplete notes on front gate';
    } else if (i === 42) {
      check = 'No address found';
      rawTitle = 'Routine inspection block review';
    } else if (i === 77) {
      check = 'Check title';
      rawTitle = 'Key handover confirmation needed';
    }

    // Add duplicate address on same date for duplicate check demo
    let finalAddress = address;
    if (i === 50) {
      // Duplicate of index 10
      finalAddress = rows[10] ? rows[10].Address : address;
    }

    rows.push({
      Date: date,
      Inspector: inspector,
      Agency: agency,
      Manager: manager,
      Address: finalAddress,
      Type: type,
      Size: size,
      'Job ref': jobRef,
      Status: status,
      Source: source,
      'To-do ID': todoId,
      'To-do updated': '2026-11-20 16:30',
      List: isRoutine ? 'Routine Inspections' : 'Main Property List',
      Link: `https://3.basecamp.com/4839201/buckets/2948201/todos/${todoId}`,
      'Raw title': rawTitle,
      Check: check,
      Note: i % 18 === 0 ? '2ND VISIT' : '',
    });
  }

  return rows;
}
