import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUploadCloud, FiFile, FiX, FiHeadphones, FiCheckCircle, 
  FiGlobe, FiPlay, FiDownload, FiArrowRight 
} from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import useNotes from '@/hooks/useNotes';
import usePodcasts from '@/hooks/usePodcasts';

export default function PodcastStudio({ onFinish }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Configure, 3: Generating, 4: Result
  const [file, setFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [uploadError, setUploadError] = useState(null);
  
  // Configuration
  const [language, setLanguage] = useState('en-US');
  const [voice, setVoice] = useState('professional');
  
  // Result
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { uploadNote, isUploading } = useNotes();
  const { generatePodcast } = usePodcasts(); // Assume this is updated later to support options

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setUploadError('Please select a valid PDF, DOCX, or TXT file under 50MB.');
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadError(null);
      const name = acceptedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDocumentTitle(name);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 52428800,
    multiple: false,
  });

  const handleContinueToConfig = () => {
    if (file && documentTitle) {
      setStep(2);
    }
  };

  const handleGenerate = async () => {
    setStep(3);
    
    try {
      // 1. Upload Note
      const noteResult = await uploadNote(file, { title: documentTitle, difficultyLevel: 'intermediate' });
      
      // Since we are mocking the AI backend for now, we will simulate the generation delay
      // In a real app, we would pass noteResult.id and language to generatePodcast
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated result
      setGeneratedAudio({
        title: `${documentTitle} - Audio Summary`,
        duration: 345,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
      });
      
      setStep(4);
    } catch (err) {
      setUploadError('Failed to generate audio. Please try again.');
      setStep(1);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
  ];

  return (
    <Card className="max-w-3xl mx-auto w-full overflow-hidden p-0 border border-white/10 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7c3aed]/10 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Progress Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-[#111117]/80 backdrop-blur-md relative z-10">
        <h2 className="text-xl font-bold text-white flex items-center">
          <FiHeadphones className="mr-3 text-[#8b5cf6]" />
          Audio Studio
        </h2>
        <div className="flex space-x-2 text-sm">
          <span className={step >= 1 ? 'text-[#8b5cf6] font-medium' : 'text-gray-500'}>Upload</span>
          <span className="text-gray-600">›</span>
          <span className={step >= 2 ? 'text-[#8b5cf6] font-medium' : 'text-gray-500'}>Configure</span>
          <span className="text-gray-600">›</span>
          <span className={step >= 3 ? 'text-[#8b5cf6] font-medium' : 'text-gray-500'}>Listen</span>
        </div>
      </div>

      <div className="p-8 relative z-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-2">Upload your document</h3>
                <p className="text-sm text-gray-400">We'll extract the text and convert it into a studio-quality podcast.</p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[250px] mb-6
                  ${isDragActive ? 'border-[#7c3aed] bg-[#7c3aed]/5' : uploadError ? 'border-red-500/50 bg-red-500/5' : 'border-white/15 bg-white/5 hover:border-[#8b5cf6]/50 hover:bg-white/10'}`}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 rounded-full bg-[#18181f] flex items-center justify-center mb-4 shadow-lg text-[#8b5cf6]">
                  <FiUploadCloud size={28} />
                </div>
                <h4 className="text-lg font-medium text-white mb-1">
                  {isDragActive ? 'Drop it here!' : 'Click or drag file to upload'}
                </h4>
                <p className="text-sm text-gray-400 mb-4">Supports PDF, DOCX, and TXT up to 50MB</p>
                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>Browse Files</Button>
              </div>

              {uploadError && <p className="text-red-400 text-sm mb-4 text-center">{uploadError}</p>}

              {file && (
                <div className="bg-[#18181f] border border-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-10 h-10 rounded bg-[#7c3aed]/20 flex items-center justify-center text-[#8b5cf6] flex-shrink-0">
                      <FiFile />
                    </div>
                    <div className="truncate">
                      <input 
                        type="text" 
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent focus:border-[#7c3aed] w-full mb-1 truncate"
                        placeholder="Document Title"
                      />
                      <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                    <FiX />
                  </button>
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={handleContinueToConfig} 
                  disabled={!file}
                  icon={<FiArrowRight />}
                  style={{ flexDirection: 'row-reverse' }}
                  className="px-8"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CONFIGURE */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-2">Configure Audio Settings</h3>
                <p className="text-sm text-gray-400">Choose the language and voice for your generated audio.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center">
                    <FiGlobe className="mr-2 text-[#8b5cf6]" /> Output Language
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center text-center
                          ${language === lang.code 
                            ? 'bg-[#7c3aed]/20 border-[#8b5cf6] text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                            : 'bg-[#18181f] border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/5'}`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center">
                    <FiHeadphones className="mr-2 text-[#8b5cf6]" /> Voice Style
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setVoice('professional')}
                      className={`p-4 rounded-xl border text-left transition-all duration-200
                        ${voice === 'professional' ? 'bg-[#7c3aed]/20 border-[#8b5cf6]' : 'bg-[#18181f] border-white/10'}`}
                    >
                      <h4 className={`font-medium mb-1 ${voice === 'professional' ? 'text-white' : 'text-gray-300'}`}>Professional</h4>
                      <p className="text-xs text-gray-500">Clear, paced, and authoritative. Best for academic papers.</p>
                    </button>
                    <button
                      onClick={() => setVoice('conversational')}
                      className={`p-4 rounded-xl border text-left transition-all duration-200
                        ${voice === 'conversational' ? 'bg-[#7c3aed]/20 border-[#8b5cf6]' : 'bg-[#18181f] border-white/10'}`}
                    >
                      <h4 className={`font-medium mb-1 ${voice === 'conversational' ? 'text-white' : 'text-gray-300'}`}>Conversational</h4>
                      <p className="text-xs text-gray-500">Engaging, dynamic, and relaxed. Best for general notes.</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleGenerate} className="px-8">
                  Generate Audio
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: GENERATING */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center min-h-[350px]"
            >
              <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-[#7c3aed] animate-spin" />
                <FiHeadphones size={40} className="text-[#8b5cf6] animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Synthesizing Audio...</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Our AI is extracting key concepts from <span className="text-white">"{documentTitle}"</span> and converting them into natural speech in <span className="text-white">{languages.find(l => l.code === language)?.name}</span>.
              </p>
            </motion.div>
          )}

          {/* STEP 4: RESULT */}
          {step === 4 && generatedAudio && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8"
            >
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-2xl mx-auto mb-4">
                  <FiCheckCircle />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Your Audio is Ready!</h3>
                <p className="text-gray-400">You can listen to it now or download it for later.</p>
              </div>

              <div className="bg-[#18181f] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.3)] relative group cursor-pointer"
                     onClick={() => setIsPlaying(!isPlaying)}>
                  <div className="absolute inset-0 bg-black/20 rounded-full group-hover:bg-black/40 transition-colors" />
                  {isPlaying ? <span className="w-6 h-6 bg-white rounded-sm" /> : <FiPlay size={32} className="text-white ml-2" />}
                </div>
                
                <div className="flex-1 text-center md:text-left w-full">
                  <Badge variant="purple" className="mb-2 uppercase tracking-wider text-[10px]">
                    {languages.find(l => l.code === language)?.name}
                  </Badge>
                  <h4 className="text-xl font-bold text-white mb-1 truncate">{generatedAudio.title}</h4>
                  <p className="text-sm text-gray-400 mb-6">EduPodcast AI • {Math.floor(generatedAudio.duration / 60)}:{(generatedAudio.duration % 60).toString().padStart(2, '0')}</p>
                  
                  {/* Decorative waveform */}
                  <div className="h-8 w-full flex items-center space-x-1 opacity-70 mb-6">
                    {[...Array(40)].map((_, i) => (
                      <motion.div 
                        key={i}
                        className="flex-1 bg-gradient-to-t from-[#7c3aed] to-[#3b82f6] rounded-full"
                        animate={{ 
                          height: isPlaying ? ['20%', `${Math.random() * 80 + 20}%`, '20%'] : '20%' 
                        }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex justify-center md:justify-start gap-4 w-full">
                    <Button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      icon={isPlaying ? null : <FiPlay />}
                      className="flex-1 md:flex-none"
                    >
                      {isPlaying ? 'Pause' : 'Listen Now'}
                    </Button>
                    <a 
                      href={generatedAudio.url} 
                      download 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-none"
                    >
                      <Button variant="outline" icon={<FiDownload />} className="w-full">
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => { setStep(1); setFile(null); setGeneratedAudio(null); setIsPlaying(false); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Create another audio
                </button>
              </div>

              {/* Hidden audio element for actual playback */}
              {isPlaying && (
                <audio autoPlay onEnded={() => setIsPlaying(false)} src={generatedAudio.url} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
