import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

const BodyVisibilityComponent = () => {
  const webcamRef = useRef(null);
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  const [poseNetModel, setPoseNetModel] = useState(null);

  // Load PoseNet model
  useEffect(() => {
    const loadPoseNetModel = async () => {
      await tf.ready(); // Make sure TensorFlow.js is ready
      const net = await posenet.load(); // Load PoseNet model
      setPoseNetModel(net);
    };
    loadPoseNetModel();
  }, []);

  // Function to detect keypoints using PoseNet
  const detectKeypoints = async () => {
    if (webcamRef.current && poseNetModel) {
      const webcamElement = webcamRef.current.video;
      const pose = await poseNetModel.estimateSinglePose(webcamElement, {
        flipHorizontal: false, // adjust based on your webcam orientation
      });

      // Check if keypoints like the nose, left shoulder, right shoulder, etc., are detected
      const keypoints = pose.keypoints;
      const bodyVisible = keypoints.some(point => point.score > 0.5); // score threshold to consider keypoints visible

      if (bodyVisible) {
        setIsBodyVisible(true);
      } else {
        setIsBodyVisible(false);
      }
    }
  };

  // Check body visibility and detect keypoints every 500ms
  useEffect(() => {
    const intervalId = setInterval(() => {
      detectKeypoints();
    }, 500);

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [poseNetModel]);

  return (
    <div>
      <video
        ref={webcamRef}
        autoPlay
        playsInline
        width="640"
        height="480"
        style={{ border: '1px solid #ccc' }}
        onCanPlay={() => console.log('Webcam is ready')}
      ></video>

      <div>
        {isBodyVisible ? (
          <p>The body is visible!</p>
        ) : (
          <p>Waiting for the body to be visible...</p>
        )}
      </div>
    </div>
  );
};

export default BodyVisibilityComponent;
