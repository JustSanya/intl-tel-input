module.exports = function(grunt) {
  grunt.registerTask('generate-scss-metadata', async function() {
    const fs = require('fs').promises;
    const path = require('path');
    const sharp = require('sharp');
    const done = this.async();

    const TARGET_WIDTH = 20;
    const TARGET_HEIGHT = 15;
    const FLAG_MARGIN = 2;

    // Function to handle special cases
    function handleSpecialCases(filename) {
      const specialCases = {
        'sh-ac.svg': 'ac'
        // Add more special cases here if needed
      };
      
      return specialCases[filename] || path.parse(filename).name.toLowerCase();
    }

    async function generateFlagMetadataAndSprite() {
      try {
        const fileWarning = "//* THIS FILE IS AUTO-GENERATED. DO NOT EDIT.";
        const flagsPath = 'node_modules/flag-icons/flags/4x3';
        const outputFile = 'src/css/_metadata.scss';
        const spriteFile1xWebP = "build/img/flags.webp";
        const spriteFile2xWebP = "build/img/flags@2x.webp";
        const spriteFile1xPNG = "build/img/flags.png";
        const spriteFile2xPNG = "build/img/flags@2x.png";
        let outputFileContent = '';

        const files = await fs.readdir(flagsPath);
        const svgFiles = files.filter(file => file.endsWith('.svg')).sort();

        let totalWidth = svgFiles.length * (TARGET_WIDTH + FLAG_MARGIN) - FLAG_MARGIN;
        const maxHeight = TARGET_HEIGHT;

        let flagsMetadata = "$flags: (\n";
        let currentOffset = 0;

        const scaledImages1x = [];
        const scaledImages2x = [];

        for (const file of svgFiles) {
          const name = handleSpecialCases(file);
          const imagePath = path.join(flagsPath, file);
          const svgBuffer = await fs.readFile(imagePath);

          const pngBuffer1x = await sharp(svgBuffer)
            .resize({
              width: TARGET_WIDTH,
              height: TARGET_HEIGHT,
              fit: sharp.fit.fill,
              position: sharp.strategy.centre
            })
            .ensureAlpha()
            .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
            .toBuffer();

          const pngBuffer2x = await sharp(svgBuffer)
            .resize({
              width: TARGET_WIDTH * 2,
              height: TARGET_HEIGHT * 2,
              fit: sharp.fit.fill,
              position: sharp.strategy.centre
            })
            .ensureAlpha()
            .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
            .toBuffer();

          scaledImages1x.push({
            buffer: pngBuffer1x,
            name: name,
            offset: currentOffset
          });

          scaledImages2x.push({
            buffer: pngBuffer2x,
            name: name,
            offset: currentOffset * 2
          });

          flagsMetadata += `  ${name}: (\n`;
          flagsMetadata += `    offset: ${-currentOffset}px,\n`;
          flagsMetadata += "  ),\n";

          currentOffset += TARGET_WIDTH + FLAG_MARGIN;
        }
        flagsMetadata += ");";

        // Create 1x sprites
        await createSprite(scaledImages1x, totalWidth, maxHeight, spriteFile1xWebP, 'webp');
        await createSprite(scaledImages1x, totalWidth, maxHeight, spriteFile1xPNG, 'png');
        console.log(`1x combined images saved as ${spriteFile1xWebP} and ${spriteFile1xPNG}`);

        // Create 2x sprites
        await createSprite(scaledImages2x, totalWidth * 2, maxHeight * 2, spriteFile2xWebP, 'webp');
        await createSprite(scaledImages2x, totalWidth * 2, maxHeight * 2, spriteFile2xPNG, 'png');
        console.log(`2x combined images saved as ${spriteFile2xWebP} and ${spriteFile2xPNG}`);

        // Generate SCSS content
        outputFileContent += fileWarning + "\n\n";
        
        outputFileContent += `$flags-sprite-1x: (\n`;
        outputFileContent += `  height: ${maxHeight}px,\n`;
        outputFileContent += `  width: ${totalWidth}px,\n`;
        outputFileContent += ");\n\n";

        outputFileContent += `$flag-width: ${TARGET_WIDTH}px;\n\n`;
        outputFileContent += `$flag-height: ${TARGET_HEIGHT}px;\n\n`;
        
        outputFileContent += flagsMetadata + "\n\n";
        outputFileContent += fileWarning + "\n";

        await fs.writeFile(outputFile, outputFileContent);
        console.log('SCSS file generated successfully.');
        done();
      } catch (error) {
        console.error('Error:', error);
        done(error);
      }
    }

    async function createSprite(images, width, height, outputFile, format) {
      const combinedImage = sharp({
        create: {
          width: width,
          height: height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });

      const compositeOperations = images.map((img) => ({
        input: img.buffer,
        left: img.offset,
        top: 0
      }));

      let processedImage = combinedImage.composite(compositeOperations);

      if (format === 'webp') {
        processedImage = processedImage.webp({
          quality: 100,
          lossless: true,
          effort: 6
        });
      } else if (format === 'png') {
        processedImage = processedImage.png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          force: true
        });
      }

      await processedImage.toFile(outputFile);
    }

    generateFlagMetadataAndSprite();
  });
};