
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
