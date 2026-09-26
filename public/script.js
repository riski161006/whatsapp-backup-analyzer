document.getElementById('uploadForm').addEventListener('submit', (e) => {
  e.preventDefault();
});

document.querySelector('.upload-box input').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/import', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      alert('✓ Import berhasil!\nTotal: ' + result.summary.total + ' nomor');
      window.location.reload();
    } else {
      alert('✗ ' + result.message);
    }
  } catch (err) {
    alert('✗ Gagal upload file: ' + err.message);
  }
});

document.getElementById('processBtn').addEventListener('click', () => {
  alert('Proses analisis lebih lanjut...');
});
