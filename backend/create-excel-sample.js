// Script to create Excel sample data for SK Officials
const XLSX = require('xlsx');

const sampleData = [
  {
    first_name: 'Maria',
    last_name: 'Santos',
    middle_name: 'Cruz',
    suffix: '',
    personal_email: 'maria.santos@gmail.com',
    position: 'SK Chairperson',
    barangay_id: 'SJB001'
  },
  {
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    middle_name: 'Reyes',
    suffix: 'Jr.',
    personal_email: 'juan.delacruz@yahoo.com',
    position: 'SK Secretary',
    barangay_id: 'SJB001'
  },
  {
    first_name: 'Ana',
    last_name: 'Garcia',
    middle_name: 'Lopez',
    suffix: '',
    personal_email: 'ana.garcia@hotmail.com',
    position: 'SK Treasurer',
    barangay_id: 'SJB002'
  },
  {
    first_name: 'Carlos',
    last_name: 'Rodriguez',
    middle_name: 'Martinez',
    suffix: '',
    personal_email: 'carlos.rodriguez@gmail.com',
    position: 'SK Councilor',
    barangay_id: 'SJB002'
  },
  {
    first_name: 'Sofia',
    last_name: 'Mendoza',
    middle_name: 'Villanueva',
    suffix: '',
    personal_email: 'sofia.mendoza@yahoo.com',
    position: 'SK Chairperson',
    barangay_id: 'SJB003'
  },
  {
    first_name: 'Miguel',
    last_name: 'Torres',
    middle_name: 'Silva',
    suffix: '',
    personal_email: 'miguel.torres@gmail.com',
    position: 'SK Secretary',
    barangay_id: 'SJB003'
  },
  {
    first_name: 'Isabella',
    last_name: 'Fernandez',
    middle_name: 'Morales',
    suffix: '',
    personal_email: 'isabella.fernandez@hotmail.com',
    position: 'SK Treasurer',
    barangay_id: 'SJB004'
  },
  {
    first_name: 'Diego',
    last_name: 'Ramirez',
    middle_name: 'Castro',
    suffix: '',
    personal_email: 'diego.ramirez@gmail.com',
    position: 'SK Councilor',
    barangay_id: 'SJB004'
  },
  {
    first_name: 'Camila',
    last_name: 'Flores',
    middle_name: 'Herrera',
    suffix: '',
    personal_email: 'camila.flores@yahoo.com',
    position: 'SK Chairperson',
    barangay_id: 'SJB005'
  },
  {
    first_name: 'Sebastian',
    last_name: 'Vargas',
    middle_name: 'Ortega',
    suffix: '',
    personal_email: 'sebastian.vargas@gmail.com',
    position: 'SK Secretary',
    barangay_id: 'SJB005'
  },
  {
    first_name: 'Valentina',
    last_name: 'Castillo',
    middle_name: 'Ruiz',
    suffix: '',
    personal_email: 'valentina.castillo@hotmail.com',
    position: 'SK Treasurer',
    barangay_id: 'SJB006'
  },
  {
    first_name: 'Mateo',
    last_name: 'Jimenez',
    middle_name: 'Moreno',
    suffix: '',
    personal_email: 'mateo.jimenez@gmail.com',
    position: 'SK Councilor',
    barangay_id: 'SJB006'
  },
  {
    first_name: 'Lucia',
    last_name: 'Gutierrez',
    middle_name: 'Alvarez',
    suffix: '',
    personal_email: 'lucia.gutierrez@yahoo.com',
    position: 'SK Chairperson',
    barangay_id: 'SJB007'
  },
  {
    first_name: 'Alejandro',
    last_name: 'Sanchez',
    middle_name: 'Gomez',
    suffix: '',
    personal_email: 'alejandro.sanchez@gmail.com',
    position: 'SK Secretary',
    barangay_id: 'SJB007'
  },
  {
    first_name: 'Martina',
    last_name: 'Diaz',
    middle_name: 'Perez',
    suffix: '',
    personal_email: 'martina.diaz@hotmail.com',
    position: 'SK Treasurer',
    barangay_id: 'SJB008'
  }
];

try {
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SK Officials Sample Data');
  
  // Write file to the root directory
  XLSX.writeFile(workbook, '../sk-officials-sample-data.xlsx');
  
  console.log('✅ Excel sample data file created successfully: sk-officials-sample-data.xlsx');
  console.log(`📊 Contains ${sampleData.length} sample SK officials`);
} catch (error) {
  console.error('❌ Error creating Excel file:', error);
}