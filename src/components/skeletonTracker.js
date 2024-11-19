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
  const [currentCamera, setCurrentCamera] = useState("user");
  const [isLightingValid, setIsLightingValid] = useState(true); // New state for lighting condition

  // Function to get the media stream with camera facing mode
  const getStream = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: currentCamera === "user" ? "user" : "environment",
          },
        });
        console.log('Stream fetched with camera mode: ', currentCamera);
        resolve(stream);
      } catch (err) {
        console.log('Error in fetching stream');
        reject(err);
      }
    });
  };

  // Initialize camera using the getStream function
  const initializeCamera = async () => {
    try {
      const stream = await getStream();
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera initialization failed:", err);
      setMessage("Failed to access camera. Please check permissions.");
    }
  };

  const toggleCamera = () => {
    setCurrentCamera((prev) => {
      const newCamera = prev === "user" ? "environment" : "user";
      // Stop the existing stream before switching
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      return newCamera;
    });
  };
  

  useEffect(() => {
    let camera = null;

    const onResults = (results) => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks) {
          //drawSkeleton(results.poseLandmarks, ctx);

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

            const boxLeft = midpointX - 2 * boxSize;
            const boxTop = midpointY - boxSize;
            const boxWidth = boxSize * 4;
            const boxHeight = boxSize * 2.6;

            ctx.beginPath();
            ctx.rect(boxLeft, boxTop, boxWidth, boxHeight);
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.stroke();

            const isBoxInFrame =
              boxLeft > 0 &&
              boxTop > 0 &&
              boxLeft + boxWidth < canvas.width &&
              boxTop + boxHeight < canvas.height;

            setIsBodyVisible(isBoxInFrame);
            setVideoStyles({ filter: isBoxInFrame ? "none" : "blur(5px)" });

            if (!isBoxInFrame) stopRecording();

            setMessage(""); // Clear message if body is in frame
          }
        } else {
          setIsBodyVisible(false);
          setVideoStyles({ filter: "blur(5px)" });
          setMessage("Ensure one person is visible in the frame.");
          stopRecording();
        }
      }
    };

    const initializePose = () => {
      const pose = new Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
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
        camera = new cam.Camera(videoRef.current, {
          onFrame: async () => {
            await pose.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });

        camera.start();
      }
    };

    initializePose();
    initializeCamera();

    return () => {
      if (camera) {
        camera.stop();
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentCamera]);

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
        
        // Trigger automatic download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "recorded-video.mp4";
        a.click(); // Automatically triggers the download
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

  const checkLightingCondition = () => {
    const luxValue = getLuxValue(); // Replace with actual lux calculation logic
    if (luxValue < 300 || luxValue > 700) {
      setIsLightingValid(false);
      stopRecording(); // Stop recording if lighting is not valid
    } else {
      setIsLightingValid(true);
    }
  };

  // Call checkLightingCondition periodically to check lux value
  useEffect(() => {
    const interval = setInterval(() => {
      checkLightingCondition();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

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
        {!isBodyVisible && (
          <div className={styles.overlayMessage}>Ensure one person is visible in the frame.</div>
        )}
      </div>

      <div className={styles.buttons}>
        <button onClick={toggleCamera}>Switch Camera</button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isBodyVisible || !isLightingValid}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      </div>

      {!isLightingValid && (
        <div style={{ color: "red", marginTop: "10px" }}>
          Lighting condition is not optimal.
        </div>
      )}
    </div>
  );
};

export default SkeletonTracker;
