const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: '/tmp/' });  // Use /tmp/ for writable file storage

// Serve static files from 'public' directory
app.use(express.static('public'));

// Serve the homepage from 'public/index.html'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/optimize', upload.single('image'), async (req, res) => {
  try {
    const inputPath = req.file.path;  // The path will now be in /tmp/
    let originalFileName = path.parse(req.file.originalname).name;
    originalFileName = originalFileName.substring(0, 6).replace(/[^a-zA-Z0-9]/g, '');
    
    const { fileType, quality, width } = req.body;
    const resolutionLabel = width === '1920' ? '1080p' : width === '1280' ? '720p' : '480p';
    const outputFileName = `iopt-${originalFileName}-${resolutionLabel}-${quality}.${fileType}`;
    const outputPath = `/tmp/${outputFileName}`;  // Save the output in /tmp/

    // Resize and convert the image
    await sharp(inputPath)
      .resize({ width: parseInt(width) })
      .toFormat(fileType, { quality: parseInt(quality) })
      .toFile(outputPath);

    // Add a 5-second delay before sending the file back
    setTimeout(() => {
      res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`); // Set the correct filename
      res.download(outputPath, () => {
        // Cleanup - delete the temporary files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    }, 5000);  // 5 seconds delay
  } catch (error) {
    console.error(error);
    res.status(500).send('Error optimizing image');
  }
});

// Export the app for Vercel to handle it
module.exports = app;
