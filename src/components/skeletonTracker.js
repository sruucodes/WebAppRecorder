import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { getLuxValue } from './LightingCondition.js'; // Ensure this is the correct path
import styles from '../styles/skeletontracker.module.css';

const SkeletonTracker = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  const [videoStyles, setVideoStyles] = useState({ filter: "blur(5px)" });
  //const [currentCamera, setCurrentCamera] = useState(null);
  const [isLightingValid, setIsLightingValid] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [cameraList, setCameraList] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const getCamAndMics = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      setCameraList(videoDevices);
      // Auto-select the first camera
      if (videoDevices.length > 0) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  };

  // Function to start the video stream with the selected camera
  // Reference to the camera stream
const cameraStreamRef = useRef(null);

const startCamera = async (deviceId) => {
  try {
    // Stop any existing stream
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Configure video options with the selected deviceId
    const videoOptions = {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    };

    // Get a new media stream
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoOptions });
    cameraStreamRef.current = stream; // Store the stream reference

    // Assign the stream to the video element
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  } catch (err) {
    console.error("Error starting camera:", err);
  }
};
  // Handle camera selection change
  const handleCameraChange = (e) => {
    const newCameraId = e.target.value;
    setSelectedCameraId(newCameraId);
    startCamera(newCameraId);
  };

  // Initialize the camera list and start the default camera
  useEffect(() => {
   getCamAndMics();
  }, []);

  // Start the camera whenever the selectedCameraId changes
  useEffect(() => {
    if (selectedCameraId) {
      startCamera(selectedCameraId);
    }
  }, [selectedCameraId]);

  const onResults = (results) => {
    if (canvasRef.current && results.poseLandmarks) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
  
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
  
      // Scale landmarks to canvas size
      const landmarks = results.poseLandmarks.map((landmark) => ({
        x: landmark.x * width,
        y: landmark.y * height,
        z: landmark.z,
        visibility: landmark.visibility,
      }));
  
      // Define the connections for the skeleton
      const connections = [
        [11, 12], // Left shoulder to right shoulder
        [11, 13], // Left shoulder to left elbow
        [13, 15], // Left elbow to left wrist
        [12, 14], // Right shoulder to right elbow
        [14, 16], // Right elbow to right wrist
        [11, 23], // Left shoulder to left hip
        [12, 24], // Right shoulder to right hip
        [23, 24], // Left hip to right hip
        [23, 25], // Left hip to left knee
        [25, 27], // Left knee to left ankle
        [24, 26], // Right hip to right knee
        [26, 28], // Right knee to right ankle
      ];
  
      // Draw skeleton
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 3;
  
      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
  
        if (startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }
      });
  
      // Draw landmarks
      ctx.fillStyle = "red";
      landmarks.forEach((landmark) => {
        if (landmark.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(landmark.x, landmark.y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
  
      // Additional body visibility logic
      const leftShoulder = results.poseLandmarks[11];
      const rightShoulder = results.poseLandmarks[12];
      const leftHip = results.poseLandmarks[23];
  
      if (leftShoulder && rightShoulder && leftHip) {
        const midpointX =
          ((leftShoulder.x + rightShoulder.x) / 2) * canvas.width;
        const midpointY =
          ((leftShoulder.y + rightShoulder.y) / 2) * canvas.height;
  
        const shoulderY = leftShoulder.y * canvas.height;
        const hipY = leftHip.y * canvas.height;
  
        const distance = Math.abs(hipY - shoulderY);
        const boxSize = distance * 2;
  
        const boxLeft = midpointX - boxSize;
        const boxTop = midpointY - boxSize;
        const boxWidth = boxSize * 2;
        const boxHeight = boxSize * 2.6;
  
        ctx.beginPath();
        ctx.rect(boxLeft, boxTop, boxWidth, boxHeight);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.stroke();
  
        const isBoxInFrame =
          boxLeft >= 0 &&
          boxTop >= 0 &&
          boxLeft + boxWidth <= width &&
          boxTop + boxHeight <= height;
  
        setIsBodyVisible(isBoxInFrame);
        setVideoStyles({ filter: isBoxInFrame ? "none" : "blur(5px)" });
  
        if (!isBoxInFrame) stopRecording();
  
        setMessage("");
      }
    } else {
      setIsBodyVisible(false);
      setVideoStyles({ filter: "blur(5px)" });
      setMessage("Ensure one person is visible in the frame.");
      stopRecording();
    }
  };
  

  const initializePose = () => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await pose.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start();
    }

    // Set canvas dimensions
    if (canvasRef.current) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }
  };

  useEffect(() => {
    initializePose();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/mp4" });
        chunksRef.current = [];

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "recorded-video.mp4";
        a.click();
      };

      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.webcamContainer}>
        <video
          ref={videoRef}
          style={{
            ...videoStyles,
            display: "block",
            visibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          autoPlay
          muted
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>

      <div className={styles.buttons}>
      <div className={styles.controls}>
        <label htmlFor="cameraPicker">Choose Camera:</label>
        <select
          id="cameraPicker"
          value={selectedCameraId || ""}
          onChange={handleCameraChange}
        >
          {cameraList.map((camera) => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId}`}
            </option>
          ))}
        </select>
      </div>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isBodyVisible || !isLightingValid}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default SkeletonTracker;