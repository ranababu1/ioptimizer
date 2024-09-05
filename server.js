const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.static('public'));
app.post('/optimize', upload.single('image'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    let originalFileName = path.parse(req.file.originalname).name;
    originalFileName = originalFileName.substring(0, 6).replace(/[^a-zA-Z0-9]/g, '');
    const { fileType, quality, width } = req.body;
        const resolutionLabel = width === '1920' ? '1080p' : width === '1280' ? '720p' : '480p';
    const outputFileName = `iopt-${originalFileName}-${resolutionLabel}-${quality}.${fileType}`;
    const outputPath = `uploads/${outputFileName}`;
    await sharp(inputPath)
      .resize({ width: parseInt(width) })
      .toFormat(fileType, { quality: parseInt(quality) })
      .toFile(outputPath);
    setTimeout(() => {
      res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`); 
      res.download(outputPath, () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    }, 5000); 
  } catch (error) {
    res.status(500).send('Error optimizing image');
  }
});
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
