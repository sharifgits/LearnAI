import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import localforage from 'localforage';
import { generateCartoonAvatar } from '../services/geminiService';

interface ProfilePictureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageData: string | null) => void;
}

export default function ProfilePictureDialog({ isOpen, onClose, onSave }: ProfilePictureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCartoonifying, setIsCartoonifying] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1024 },
          height: { ideal: 1024 }
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Please allow camera access to take a profile picture.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setIsCartoonifying(false);
    }
    return () => stopCamera();
  }, [isOpen, stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageUrl);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleCartoonify = async () => {
    if (!capturedImage) return;
    setIsCartoonifying(true);
    try {
      const cartoon = await generateCartoonAvatar(capturedImage);
      setCapturedImage(cartoon);
    } catch (err: any) {
      console.error("Cartoonify failed:", err);
      alert("Failed to make avatar: " + err.message);
    } finally {
      setIsCartoonifying(false);
    }
  };

  const handleSave = () => {
    if (capturedImage) {
      localforage.setItem('profile_picture', capturedImage);
      onSave(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm max-h-[95dvh] overflow-y-auto flex flex-col gap-6"
        >
          <div className="flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold text-white tracking-tight">Profile Photo</h2>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
            {error ? (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-medium text-center flex flex-col gap-3">
                <p>{error}</p>
                <p className="text-xs text-rose-300">
                  You might need to open this app in a new tab to grant camera access, or you can upload a photo instead.
                </p>
                
                <label className="mt-2 cursor-pointer bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                  Upload Custom Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCapturedImage(reader.result as string);
                          setError(null);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </label>
              </div>
            ) : (
              <div className="relative aspect-square w-full sm:max-w-xs mx-auto rounded-2xl overflow-hidden bg-slate-950 shadow-inner flex items-center justify-center border-2 border-slate-800 shrink-0">
                {!capturedImage ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            <div className="flex flex-col gap-3 shrink-0">
              {!capturedImage ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={capturePhoto}
                    disabled={!!error}
                    className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Camera size={20} />
                    Capture Photo
                  </button>
                  <label className="w-full cursor-pointer bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
                    Upload Instead
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCapturedImage(reader.result as string);
                            setError(null);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleCartoonify}
                    disabled={isCartoonifying}
                    className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                  >
                    {isCartoonifying ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {isCartoonifying ? "Generating Avatar..." : "AI Cartoonify"}
                  </button>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={retakePhoto}
                      disabled={isCartoonifying}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw size={20} />
                      Retake
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isCartoonifying}
                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Check size={20} />
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
