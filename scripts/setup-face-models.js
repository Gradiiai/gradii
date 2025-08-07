#!/usr/bin/env node

/**
 * Setup script for face recognition models
 * Downloads and sets up face-api.js models in the public directory
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

const MODELS = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
  'face_expression_model-weights_manifest.json',
  'face_expression_model.bin',
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(dest, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function setupModels() {
  console.log('🚀 Setting up face recognition models...');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`✅ Created models directory: ${MODELS_DIR}`);
  }
  
  // Download each model file
  for (const model of MODELS) {
    const modelPath = path.join(MODELS_DIR, model);
    
    // Skip if file already exists
    if (fs.existsSync(modelPath)) {
      console.log(`⏭️  Model already exists: ${model}`);
      continue;
    }
    
    try {
      const url = `${MODEL_BASE_URL}/${model}`;
      console.log(`📥 Downloading ${model}...`);
      
      await downloadFile(url, modelPath);
      console.log(`✅ Downloaded: ${model}`);
    } catch (error) {
      console.error(`❌ Failed to download ${model}:`, error.message);
    }
  }
  
  console.log('🎉 Face recognition models setup complete!');
  console.log(`📁 Models location: ${MODELS_DIR}`);
  
  // Create a simple verification script
  const verificationScript = `
// Verify models are loaded correctly
import * as faceapi from '@vladmandic/face-api';

export async function verifyModels() {
  try {
    const modelPath = '/models';
    
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
    
    console.log('✅ All face recognition models loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading face recognition models:', error);
    return false;
  }
}
`;
  
  const verificationPath = path.join(__dirname, '..', 'lib', 'utils', 'verify-face-models.ts');
  fs.writeFileSync(verificationPath, verificationScript);
  console.log(`✅ Created model verification script: ${verificationPath}`);
}

// Run the setup
setupModels().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});