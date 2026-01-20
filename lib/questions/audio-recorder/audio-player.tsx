import { useAssetStorage } from '@/features/asset-storage/client';
import { IFile } from "@/lib/questions/file/file-type";
import { Download, Pause, Play } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface AudioPlayerProps {
  file: IFile | IFile[] | undefined;
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
  const { resolveStorageUrl } = useAssetStorage();

  const isArray = Array.isArray(file);
  const singleFile = !isArray ? file : undefined;

  const audioSource = useMemo(() => {
    if (!singleFile?.content) {
      return "";
    }

    if (singleFile.content.startsWith("http")) {
      return resolveStorageUrl(singleFile.content);
    }

    if (singleFile.content.startsWith("data:")) {
      return singleFile.content;
    }

    // If it's Base64 content without data URL prefix, add audio MIME type
    const mimeType = singleFile.type || "audio/wav";
    return `data:${mimeType};base64,${singleFile.content}`;
  }, [singleFile, resolveStorageUrl]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying((prev) => !prev);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!singleFile || !audioSource) return;

    const link = document.createElement("a");
    link.href = audioSource;
    link.download = singleFile.name || "audio-recording";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [singleFile, audioSource]);

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", () => setIsPlaying(false));

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", () => setIsPlaying(false));
      };
    }
  }, [handleTimeUpdate]);

  // Update progress bar fill CSS custom property on the specific element
  useEffect(() => {
    if (duration > 0 && progressBarRef.current) {
      const progress = (currentTime / duration) * 100;
      progressBarRef.current.style.setProperty("--progress", `${progress}%`);
    }
  }, [currentTime, duration]);

  if (!file) {
    return null;
  }

  if (isArray) {
    return (
      <div className="endatix_audio_list">
        {file.map((f) => (
          <AudioPlayer key={f.name} file={f} isDisplayMode={isDisplayMode} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`endatix_audio_player ${
        isDisplayMode ? "endatix_audio_player_display" : ""
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
        key={audioSource} // Re-mount if source changes to ensure proper loading
        className="endatix_audio_element"
        title={singleFile?.name || "Audio recording"}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        preload="metadata"
      >
        <source src={audioSource} type={singleFile?.type || "audio/wav"} />
        Your browser does not support the audio element.
      </audio>

      {!isLoading && !hasError && (
        <div className="endatix_audio_custom_controls">
          <button
            onClick={handlePlayPause}
            className="endatix_audio_play_button"
            aria-label={isPlaying ? "Pause" : "Play"}
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

      {singleFile?.name && <div className="endatix_audio_filename">{singleFile.name}</div>}
    </div>
  );
};
