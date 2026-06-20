import { useRef, useState } from 'react';
import { useMeetingStore } from '../store/meeting.store';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useRecording = (meetingId: string) => {
  const { isRecording, toggleRecording } = useMeetingStore();
  const { user } = useAuthStore();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      // 1. Prompt user for screen to record
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;

      // 2. Initialize MediaRecorder
      const options = { mimeType: 'video/webm' };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // When the user clicks "Stop sharing" on the browser native banner
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          stopRecording();
        }
      };

      recorder.start(1000); // chunk every second
      toggleRecording(); // update global state
      toast.success('Recording started');

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not start recording. Permission denied?');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = async () => {
      toggleRecording(); // isRecording = false
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];

      // Stop the stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      await uploadRecording(blob);
    };

    mediaRecorderRef.current.stop();
  };

  const uploadRecording = async (blob: Blob) => {
    const toastId = toast.loading('Uploading recording...');
    try {
      const formData = new FormData();
      formData.append('video', blob, `recording-${meetingId}.webm`);
      formData.append('meetingId', meetingId);
      
      await api.post('/recordings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Recording saved successfully!', { id: toastId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload recording.', { id: toastId });
    }
  };

  return { startRecording, stopRecording };
};
