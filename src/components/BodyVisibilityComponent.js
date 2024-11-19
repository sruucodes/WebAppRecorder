// src/components/BodyVisibilityComponent.js
import React, { useEffect } from 'react';
import * as posenet from '@tensorflow-models/posenet';

function BodyVisibilityComponent({ webcamRef, poseNetModel, setIsBodyVisible, isBodyVisible, setMessage }) {
  // Function to detect keypoints using PoseNet
  const detectKeypoints = async () => {
    if (webcamRef.current && poseNetModel) {
      const webcamElement = webcamRef.current.video;
      const pose = await poseNetModel.estimateSinglePose(webcamElement, {
        flipHorizontal: false,
      });
      const keypoints = pose.keypoints;
      const criticalKeypoints = [
        'leftShoulder', 'rightShoulder', 
        'leftHip', 'rightHip',
        'leftKnee', 'rightKnee',
        'leftAnkle', 'rightAnkle'
      ];
      const bodyVisible = criticalKeypoints.every(point => {
        const keypoint = keypoints.find(kp => kp.part === point);
        return keypoint && keypoint.score > 0.6;
      });

      setIsBodyVisible(bodyVisible);
    }
  };

  // Check body visibility every 500ms
  useEffect(() => {
    const intervalId = setInterval(() => {
      detectKeypoints();
    }, 500);

    return () => clearInterval(intervalId);
  }, [poseNetModel]);

  useEffect(() => {
    if (isBodyVisible) {
      setMessage('Optimal conditions. You can start recording now.');
    } else {
      setMessage('Ensure your entire body is visible');
    }
  }, [isBodyVisible, setMessage]);

  return null; // This component doesn't render anything
}

export default BodyVisibilityComponent;
