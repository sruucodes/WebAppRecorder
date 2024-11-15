import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { saveAs } from 'file-saver';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';
import styles from '../styles/webrecorder.module.css';
import LightingCondition from './LightingCondition.js';

// WebRecorder Component
function WebRecorder() {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [videoChunks, setVideoChunks] = useState([]);
  const [isBlurred, setIsBlurred] = useState(true); 
  const [message, setMessage] = useState('Ensure your entire body is visible');
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  const [poseNetModel, setPoseNetModel] = useState(null);
  const [isLightingOptimal, setIsLightingOptimal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera

  // Load PoseNet model
  useEffect(() => {
    const loadPoseNetModel = async () => {
      await tf.ready();
      const net = await posenet.load();
      setPoseNetModel(net);
    };
    loadPoseNetModel();
  }, []);

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

  // Check body visibility and detect keypoints every 500ms
  useEffect(() => {
    const intervalId = setInterval(() => {
      detectKeypoints();
      if (recording && (!isBodyVisible || !isLightingOptimal)) {
        handleStopRecording();
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [poseNetModel, isBodyVisible, recording, isLightingOptimal]);

  // Update blur status and message when body visibility changes
  useEffect(() => {
    if (isBodyVisible && isLightingOptimal) {
      setIsBlurred(false);
      setMessage('Optimal conditions. You can start recording now.');
    } else {
      setIsBlurred(true);
      setMessage(isBodyVisible ? 'Adjust lighting to optimal range.' : 'Ensure your entire body is visible');
    }
  }, [isBodyVisible, isLightingOptimal]);

  // Handle the start recording button click
  const handleStartRecording = () => {
    if (isBodyVisible && isLightingOptimal) {
      setRecording(true);
      const mediaStream = webcamRef.current.stream;
      mediaRecorderRef.current = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm',
      });
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.start();
    } else {
      setMessage('Ensure body visibility and optimal lighting before recording.');
    }
  };

  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      setVideoChunks((prev) => [...prev, event.data]);
    }
  };

  const handleStopRecording = () => {
    setRecording(false);
    mediaRecorderRef.current?.stop();
    setMessage('Recording stopped due to changes in conditions.');
  };

  const handleSaveVideo = () => {
    const blob = new Blob(videoChunks, { type: 'video/webm' });
    saveAs(blob, 'recorded_video.webm');
    setVideoChunks([]);
  };

  // Handle lighting change (Lux value from LightingCondition)
  const handleLightingChange = (LightingCondition) => {
    console.log(`Lux Value: ${LightingCondition}`);

    // Check if Lux value is within the desired range (4000 to 6000 Lux)
    const withinRange =LightingCondition>= 300 && LightingCondition <= 700;
    setIsLightingOptimal(withinRange);

    if (!withinRange && recording) {
      handleStopRecording();
      setMessage('Recording stopped due to inadequate lighting.');
    }
  };

  // Toggle between front and back camera
  const toggleCamera = () => {
    setCameraFacingMode((prevMode) => (prevMode === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className={styles.container}>
      <div className={styles.webcamContainer}>
        <Webcam
          audio={true}
          ref={webcamRef}
          videoConstraints={{
            facingMode: cameraFacingMode, // Switch between 'user' and 'environment' for front/back cameras
          }}
          style={{
            filter: isBlurred ? 'blur(10px)' : 'none',
            width: '100%',
            height: 'auto',
          }}
        />
        <div className={styles.overlayMessage}>{message}</div>
      </div>

      <LightingCondition 
        videoRef={webcamRef} 
        onLightingChange={handleLightingChange} // Pass handleLightingChange to LightingCondition
      />

      <div className={styles.buttons}>
        <button onClick={handleStartRecording} disabled={recording || !isBodyVisible || !isLightingOptimal}>
          Start Recording
        </button>
        <button onClick={handleStopRecording} disabled={!recording}>
          Stop Recording
        </button>
        {videoChunks.length > 0 && (
          <button onClick={handleSaveVideo}>Save Video</button>
        )}
        {/* Button to toggle between front and back camera */}
        <button onClick={toggleCamera}>
          Switch Camera
        </button>
      </div>
    </div>
  );
}

export default WebRecorder;
