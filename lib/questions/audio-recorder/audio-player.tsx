import React, { useState, useRef, useEffect } from 'react';
import { File } from '@/lib/questions/file/file-type';
import { Play, Pause, Download } from 'lucide-react';

interface AudioPlayerProps {
  file: File | File[] | undefined;
  isDisplayMode?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  file,
  isDisplayMode = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLInputElement>(null);

  const getAudioSource = (file: File): string => {
    if (!file.content) {
      return '';
    }

    // If content starts with 'data:' or 'http', it's already a valid source
    if (file.content.startsWith('data:') || file.content.startsWith('http')) {
      return file.content;
    }

    // If it's Base64 content without data URL prefix, add audio MIME type
    const mimeType = file.type || 'audio/wav';
    return `data:${mimeType};base64,${file.content}`;
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleDownload = () => {
    if (!file || Array.isArray(file) || !file.content) return;
    
    const audioSource = getAudioSource(file);
    const link = document.createElement('a');
    link.href = audioSource;
    link.download = file.name || 'audio-recording';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', () => setIsPlaying(false));
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, []);

  // Update progress bar fill CSS custom property on the specific element
  useEffect(() => {
    if (duration > 0 && progressBarRef.current) {
      const progress = (currentTime / duration) * 100;
      progressBarRef.current.style.setProperty('--progress', `${progress}%`);
    }
  }, [currentTime, duration]);

  if (!file) {
    return null;
  }

  const isArray = Array.isArray(file);

  if (isArray) {
    return (
      <div>
        {file.map((f) => (
          <AudioPlayer key={f.name} file={f} isDisplayMode={isDisplayMode} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`endatix_audio_player ${
        isDisplayMode ? 'endatix_audio_player_display' : ''
      }`}
    >
      {isLoading && (
        <div className="endatix_audio_loading">Loading audio...</div>
      )}

      {hasError && (
        <div className="endatix_audio_error">Failed to load audio file</div>
      )}

      <audio
        ref={audioRef}
        className="endatix_audio_element"
        title={file.name || 'Audio recording'}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        preload="metadata"
      >
        <source src={getAudioSource(file)} type={file.type || 'audio/wav'} />
        Your browser does not support the audio element.
      </audio>

      {!isLoading && !hasError && (
        <div className="endatix_audio_custom_controls">
          <button
            onClick={handlePlayPause}
            className="endatix_audio_play_button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="endatix_audio_icon" />
            ) : (
              <Play className="endatix_audio_icon" />
            )}
          </button>
          
          <div className="endatix_audio_progress_container">
            <input
              ref={progressBarRef}
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="endatix_audio_progress_bar"
              aria-label="Audio progress"
            />
            <div className="endatix_audio_time_display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="endatix_audio_download_button"
            aria-label="Download audio file"
            title="Download audio file"
          >
            <Download className="endatix_audio_icon" />
          </button>
        </div>
      )}

      {file.name && <div className="endatix_audio_filename">{file.name}</div>}
    </div>
  );
};
