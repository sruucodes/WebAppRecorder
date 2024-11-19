// import React, { useEffect, useRef } from 'react';

// function GreenBox({ keypoints, videoWidth, videoHeight, stopRecording }) {
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     const drawBoundingBox = () => {
//       const canvas = canvasRef.current;
//       const ctx = canvas.getContext('2d');
//       canvas.width = videoWidth;
//       canvas.height = videoHeight;
      
//       // Clear the canvas
//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       // Check if the required keypoints exist
//       const leftShoulder = keypoints.find((kp) => kp.part === 'leftShoulder');
//       const leftHip = keypoints.find((kp) => kp.part === 'leftHip');

//       if (leftShoulder && leftHip) {
//         // Calculate the distance between leftShoulder and leftHip
//         const distance = Math.sqrt(
//           Math.pow(leftHip.position.x - leftShoulder.position.x, 2) +
//           Math.pow(leftHip.position.y - leftShoulder.position.y, 2)
//         );

//         // Define the bounding box based on 3x the distance
//         const offsetX = distance * 3;
//         const offsetY = distance * 3;
//         const box = {
//           x1: leftShoulder.position.x - offsetX,
//           y1: leftShoulder.position.y - offsetY,
//           x2: leftShoulder.position.x + offsetX,
//           y2: leftShoulder.position.y + offsetY,
//         };

//         // Check if the box is within frame bounds
//         const isInFrame =
//           box.x1 >= 0 && box.y1 >= 0 &&
//           box.x2 <= videoWidth && box.y2 <= videoHeight;

//         if (!isInFrame) {
//           stopRecording('Out of bounds: The bounding box is out of the video frame.');
//         }

//         // Draw the bounding box
//         ctx.beginPath();
//         ctx.rect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
//         ctx.lineWidth = 2;
//         ctx.strokeStyle = 'green';
//         ctx.stroke();
//       }
//     };

//     drawBoundingBox();
//   }, [keypoints, videoWidth, videoHeight, stopRecording]);

//   return <canvas ref={canvasRef} style={{ position: 'absolute' }} />;
// }

// export default GreenBox;
