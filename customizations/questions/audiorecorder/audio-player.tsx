import React, { useState } from "react";
import { File } from "@/lib/questions/file/file-type";

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

  const getAudioSource = (file: File): string => {
    if (!file.content) {
      return "";
    }

    // If content starts with 'data:' or 'http', it's already a valid source
    if (file.content.startsWith("data:") || file.content.startsWith("http")) {
      return file.content;
    }

    // If it's Base64 content without data URL prefix, add audio MIME type
    const mimeType = file.type || "audio/wav";
    return `data:${mimeType};base64,${file.content}`;
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

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
        controls
        className="endatix_audio_element"
        title={file.name || "Audio recording"}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        preload="metadata"
      >
        <source src={getAudioSource(file)} type={file.type || "audio/wav"} />
        Your browser does not support the audio element.
      </audio>

      {file.name && <div className="endatix_audio_filename">{file.name}</div>}
    </div>
  );
};
