import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import { getLuxValue } from './LightingCondition.js'; // Ensure this is the correct path

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

  const initializeCamera = (cameraFacing) => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: 640,
          height: 480,
        },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch((err) => {
        console.error("Camera initialization failed:", err);
        setMessage("Failed to access camera. Please check permissions.");
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
          drawSkeleton(results.poseLandmarks, ctx);

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

            // ctx.beginPath();
            // ctx.arc(midpointX, midpointY, 5, 0, 2 * Math.PI);
            // // ctx.fillStyle = "green";
            // ctx.fill();

            const isBoxInFrame =
              boxLeft > 0 &&
              boxTop > 0 &&
              boxLeft + boxWidth < canvas.width &&
              boxTop + boxHeight < canvas.height;

            setIsBodyVisible(isBoxInFrame);
            setVideoStyles({ filter: isBoxInFrame ? "none" : "blur(5px)" });

            if (!isBoxInFrame) stopRecording();

            setMessage(
              
            );
          }
        } else {
          setIsBodyVisible(false);
          setVideoStyles({ filter: "blur(5px)" });
          setMessage("Ensure one person is visible in the frame.");
          stopRecording();
        }
      }
    };
    const drawSkeleton = (poseLandmarks, ctx) => {
      // If you don't want any skeleton or points, simply return early
      return;
    };
    

    // const drawSkeleton = (poseLandmarks, ctx) => {
    //   const canvasWidth = canvasRef.current.width;
    //   const canvasHeight = canvasRef.current.height;

    //   const drawLandmark = (x, y, label) => {
    //     ctx.beginPath();
    //     ctx.arc(x, y, 5, 0, 2 * Math.PI);
    //     ctx.fillStyle = "green";
    //     ctx.fill();

    //     ctx.font = "12px Arial";
    //     ctx.fillStyle = "white";
    //     ctx.textAlign = "center";
    //     ctx.fillText(label, x, y - 10);
    //   };

    //   const drawConnection = (start, end) => {
    //     ctx.beginPath();
    //     ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
    //     ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
    //     ctx.strokeStyle = "green";
    //     ctx.lineWidth = 2;
    //     ctx.stroke();
    //   };

    //   poseLandmarks.forEach((landmark, idx) => {
    //     const x = landmark.x * canvasWidth;
    //     const y = landmark.y * canvasHeight;
    //     drawLandmark(x, y, idx);
    //   });

    //   const connections = [
    //     [11, 12],
    //     [11, 23],
    //     [12, 24],
    //     [23, 24],
    //     [11, 13],
    //     [13, 15],
    //     [12, 14],
    //     [14, 16],
    //     [23, 25],
    //     [25, 27],
    //     [24, 26],
    //     [26, 28],
    //     [15, 21],
    //     [16, 22],
    //   ];

    //   connections.forEach(([startIdx, endIdx]) => {
    //     const start = poseLandmarks[startIdx];
    //     const end = poseLandmarks[endIdx];
    //     drawConnection(start, end);
    //   });
    // };

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
    initializeCamera(currentCamera);

    return () => {
      if (camera) {
        camera.stop();
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentCamera]);

  const toggleCamera = () => {
    setCurrentCamera((prev) =>
      prev === "user" ? "environment" : "user"
    );
  };

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
    <div>
      <div
        style={{
          position: "relative",
          width: "640px",
          height: "480px",
        }}
      >
        <div
  style={{
    position: "relative",  // Parent container to hold the video and canvas
    width: "640px",        // Set the width of the video and canvas container
    height: "480px",       // Set the height of the video and canvas container
  }}
>
  <video
    ref={videoRef}
    style={{
      ...videoStyles,
      display: "block",
      position: "absolute", // Ensure it is positioned absolutely within the parent
      top: 0,
      left: 0,
      width: "100%",        // Make the video fill the entire container width
      height: "100%",       // Make the video fill the entire container height
    }}
    autoPlay
  />
  <canvas
    ref={canvasRef}
    style={{
      position: "absolute", // Position canvas exactly on top of the video
      top: 0,               // Align top edge
      left: 0,              // Align left edge
      width: "100%",        // Make the canvas fill the entire width
      height: "100%",       // Make the canvas fill the entire height
      pointerEvents: "none",// Allow interactions to pass through the canvas
    }}
  />
</div>

      </div>
      <button onClick={toggleCamera}>Switch Camera</button>
      <button
  onClick={isRecording ? stopRecording : startRecording}
  disabled={!isBodyVisible || !isLightingValid} // Disable if the body is not fully visible or lighting is not valid
>
  {isRecording ? "Stop Recording" : "Start Recording"}
</button>
<div>{message}</div>
{!isLightingValid && <div style={{ color: "red" }}>Lighting is not optimal</div>}
</div>
  );
};

export default SkeletonTracker;
