// src/components/GreenBox.js
import React, { useEffect, useRef } from 'react';

function GreenBox({ keypoints, videoWidth, videoHeight }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (keypoints && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && videoWidth && videoHeight) {
        // Clear the canvas before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set canvas size to match video dimensions
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Draw green box around the keypoints
        keypoints.forEach(point => {
          if (point.score > 0.5) {
            ctx.beginPath();
            ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
          }
        });

        // Draw green box based on keypoint positions (e.g., body bounding box)
        if (keypoints.length >= 2) {
          const leftShoulder = keypoints.find(kp => kp.part === 'leftShoulder');
          const rightShoulder = keypoints.find(kp => kp.part === 'rightShoulder');
          const leftHip = keypoints.find(kp => kp.part === 'leftHip');
          const rightHip = keypoints.find(kp => kp.part === 'rightHip');

          if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const minX = Math.min(leftShoulder.position.x, rightShoulder.position.x, leftHip.position.x, rightHip.position.x);
            const minY = Math.min(leftShoulder.position.y, rightShoulder.position.y, leftHip.position.y, rightHip.position.y);
            const maxX = Math.max(leftShoulder.position.x, rightShoulder.position.x, leftHip.position.x, rightHip.position.x);
            const maxY = Math.max(leftShoulder.position.y, rightShoulder.position.y, leftHip.position.y, rightHip.position.y);

            // Draw a green bounding box around the body
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
          }
        }
      }
    }
  }, [keypoints, videoWidth, videoHeight]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }} />;
}

export default GreenBox;
