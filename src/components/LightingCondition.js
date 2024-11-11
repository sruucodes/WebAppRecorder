// LightingCondition.js
import React, { useEffect, useState } from 'react';

function LightingCondition({ videoRef, onLightingChange }) {
  const [lux, setLux] = useState(0);

  const calculateBrightness = (imageData) => {
    let brightness = 0;
    const data = imageData.data;
    const length = data.length;
    for (let i = 0; i < length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pixelBrightness = (r + g + b) / 3;
      brightness += pixelBrightness;
    }
    return brightness / (length / 4);
  };

  const calculateLux = (brightness) => {
    const normalizedBrightness = brightness / 255;
const luxFactor = 1000;
return normalizedBrightness * luxFactor;

  };

  const updateLux = () => {
    if (videoRef.current && videoRef.current.video) {
      const video = videoRef.current.video;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const brightness = calculateBrightness(imageData);
        const calculatedLux = calculateLux(brightness);
        
        setLux(calculatedLux);
        onLightingChange(calculatedLux);
      }
    }
  };

  useEffect(() => {
    const intervalId = setInterval(updateLux, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>Current Lux: {lux.toFixed(2)}</div>
  );
}

export default LightingCondition;

