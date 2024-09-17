'use client'
import { Link } from '@/i18n/routing';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { Dropzone } from './Drapzone';

const MAX_FILE_SIZE = 1000 * 1024 * 1024; // 1000MB

const VideoCompressor: React.FC = () => {
  const t = useTranslations('VideoCompressor');
  const [inputVideo, setInputVideo] = useState<File | null>(null);
  const [outputVideo, setOutputVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
    const ffmpegInstance = ffmpegRef.current;
    ffmpegInstance.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });
    ffmpegInstance.on("log", ({ message }) => {
      setLogMessages(prev => [...prev, message]);
    });
    try {
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
    } catch (error) {
      throw error;
    }
  };

  const compress = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpegRef.current || !inputVideo) return;

    setCompressing(true);
    setLogMessages([]);
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    await ffmpeg.writeFile(inputFileName, await fetchFile(inputVideo));

    await ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-tag:v', 'avc1',
      '-movflags', 'faststart',
      '-crf', '30',
      '-preset', 'superfast',
      '-threads', '4',
      '-progress', '-',
      '-v', '',
      '-y',
      outputFileName
    ]);

    const data = await ffmpeg.readFile(outputFileName);
    const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
    setOutputVideo(url);
    setCompressing(false);

    // Calculate compression stats
    const originalSize = inputVideo.size;
    const compressedSize = data.byteLength;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    setCompressionStats({
      originalSize,
      compressedSize,
      compressionRatio
    });
  };

  const handleFileChange = (file: File) => {
    if (file) {
      setInputVideo(file);
    }
  };

  const handleDownload = () => {
    if (outputVideo) {
      const a = document.createElement('a');
      a.href = outputVideo;
      a.download = 'compressed_video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  return (
    <div className="mx-auto py-8 md:py-12 max-w-3xl min-w-[280px] sm:min-w-[480px] md:min-w-[640px] lg:min-w-[768px] px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-gray-200">{t('title')}</h2>
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
          {t('recommendScreenRecorder')}
        </Link>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <a href="https://ffmpeg.org/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            {t('poweredByFFmpeg')}
          </a>
        </p>
      </div>
      <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200">
        <p className="font-bold">{t('maxFileSizeWarning')}</p>
        <p>{t('maxFileSizeDescription')}</p>
      </div>
      <div className="mb-6">
        <Dropzone
          onChange={handleFileChange}
          className="w-full h-32"
          fileExtension="mp4"
        />
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <button
        onClick={compress}
        disabled={!inputVideo || compressing}
        className={`w-full py-3 px-4 rounded-md text-white font-semibold transition-colors duration-200 ${!inputVideo || compressing
          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
          }`}
      >
        {compressing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('compressing')}
          </span>
        ) : (
          t('compressVideo')
        )}
      </button>
      {compressing && (
        <div className="mt-6">
          <div className="relative pt-1">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-blue-700">
              <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-400 transition-all duration-300"></div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">{t('compressingProgress', { progress })}</p>
        </div>
      )}
      {compressionStats && (
        <div className="mt-6 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">{t('compressionResults')}</h3>
          <div className="flex justify-between items-center mb-3">
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">{t('originalSize', { size: (compressionStats.originalSize / 1024 / 1024).toFixed(2) })}</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{t('compressedSize', { size: (compressionStats.compressedSize / 1024 / 1024).toFixed(2) })}</p>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div className="bg-green-600 dark:bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${100 - (compressionStats.compressedSize / compressionStats.originalSize) * 100}%` }}></div>
          </div>
          <p className="text-xl font-bold text-center text-blue-600 dark:text-blue-400">
            {t('compressionRatio', { power: (100 - (compressionStats.compressedSize / compressionStats.originalSize) * 100).toFixed(2) })}
          </p>
        </div>
      )}
      {outputVideo && (
        <div className="mt-6">
          <button
            onClick={handleDownload}
            className="w-full py-3 px-4 rounded-md text-white font-semibold bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors duration-200"
          >
            {t('downloadCompressedVideo')}
          </button>
          <h3 className="text-xl font-semibold my-4 text-gray-800 dark:text-gray-200">{t('compressedVideo')}</h3>
          <video src={outputVideo} controls className="w-full rounded-lg shadow-lg mb-6">
            {t('videoNotSupported')}
          </video>
        </div>
      )}

      {/* <div className="mt-6">
        <button
          onClick={toggleLogs}
          className="w-full py-3 px-4 rounded-md text-white font-semibold bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 transition-colors duration-200"
        >
          {showLogs ? t('hideLogs') : t('showLogs')}
        </button>
        {showLogs && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">{t('logMessages')}</h3>
            <div className="max-h-48 overflow-y-auto">
              {logMessages.map((message, index) => (
                <p key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-1">{message}</p>
              ))}
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
};

export default VideoCompressor;