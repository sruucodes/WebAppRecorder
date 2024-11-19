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
  const [currentCamera, setCurrentCamera] = useState(null);
  const [isLightingValid, setIsLightingValid] = useState(true);
  const [cameras, setCameras] = useState([]);

  // Fetch available cameras
  const getCamerasAndMics = () => {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const cameraList = devices.filter((device) => device.kind === "videoinput");
        setCameras(cameraList);
        if (cameraList.length > 0) {
          setCurrentCamera(cameraList[0].deviceId);
        }
      })
      .catch((err) => console.log("Error enumerating devices:", err));
  };

  // Initialize the camera with the selected deviceId
  const initializeCamera = async (cameraId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: cameraId } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera initialization failed:", err);
      setMessage("Failed to access camera. Please check permissions.");
    }
  };

  // Toggle between cameras
  const toggleCamera = () => {
    if (currentCamera && cameras.length > 1) {
      const newCamera = currentCamera === cameras[0].deviceId ? cameras[1].deviceId : cameras[0].deviceId;
      setCurrentCamera(newCamera);
    }
  };

  useEffect(() => {
    getCamerasAndMics();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (currentCamera) {
      initializeCamera(currentCamera);
    }
  }, [currentCamera]);

  const onResults = (results) => {
    if (canvasRef.current && results.poseLandmarks) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

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

        setMessage(""); // Clear message if body is detected in the frame
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
        <button onClick={toggleCamera}>Switch Camera</button>
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
