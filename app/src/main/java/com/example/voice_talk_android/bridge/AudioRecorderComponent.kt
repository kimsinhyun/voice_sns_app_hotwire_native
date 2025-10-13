package com.example.voice_talk_android.bridge

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import dev.hotwire.core.bridge.BridgeComponent
import dev.hotwire.core.bridge.BridgeDelegate
import dev.hotwire.core.bridge.Message
import dev.hotwire.navigation.destinations.HotwireDestination
import kotlinx.serialization.Serializable
import java.io.File
import java.io.IOException

class AudioRecorderComponent(
    name: String,
    private val delegate: BridgeDelegate<HotwireDestination>
) : BridgeComponent<HotwireDestination>(name, delegate) {

    private var mediaRecorder: MediaRecorder? = null
    private var mediaPlayer: MediaPlayer? = null
    private var recordingFile: File? = null
    private var recordingStartTime: Long = 0

    companion object {
        private const val TAG = "AudioRecorder"
        private const val COMPONENT_NAME = "audio-recorder"
    }

    override fun onReceive(message: Message) {
        Log.d(TAG, "🎤 AudioRecorderComponent received: ${message.event}")

        when (message.event) {
            "startRecording" -> handleStartRecording(message)
            "stopRecording" -> handleStopRecording(message)
            "playAudio" -> handlePlayAudio(message)
            "pauseAudio" -> handlePauseAudio(message)
            "stopAudio" -> handleStopAudio(message)
            "getAudioData" -> handleGetAudioData(message)
            else -> Log.w(TAG, "❌ Unknown event: ${message.event}")
        }
    }

    // MARK: - 녹음 시작

    private fun handleStartRecording(message: Message) {
        Log.d(TAG, "🎤 Starting recording...")

        // 마이크 권한 확인
        if (!checkMicrophonePermission()) {
            Log.e(TAG, "❌ Microphone permission denied")
            replyTo(message.event)
            return
        }

        try {
            // 임시 파일 생성
            val timestamp = System.currentTimeMillis()
            val context = delegate.destination.fragment.requireContext()
            val outputDir = context.cacheDir
            recordingFile = File(outputDir, "recording_$timestamp.m4a")

            Log.d(TAG, "📁 Recording file: ${recordingFile?.absolutePath}")

            // MediaRecorder 설정
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(48000)
                setAudioSamplingRate(44100)
                setOutputFile(recordingFile?.absolutePath)
                
                prepare()
                start()
            }

            recordingStartTime = System.currentTimeMillis()
            Log.d(TAG, "✅ Recording started")
            replyTo(message.event)

        } catch (e: IOException) {
            Log.e(TAG, "❌ Recording setup failed: ${e.message}")
            replyTo(message.event)
        }
    }

    // MARK: - 녹음 중지

    private fun handleStopRecording(message: Message) {
        Log.d(TAG, "🎤 Stopping recording...")

        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null

            val duration = (System.currentTimeMillis() - recordingStartTime) / 1000.0
            Log.d(TAG, "✅ Recording stopped, duration: ${duration}s")
            Log.d(TAG, "📁 File exists: ${recordingFile?.exists()}, size: ${recordingFile?.length()} bytes")

            // Duration을 JavaScript로 전송
            replyTo(message.event, StopRecordingResponse(duration))

        } catch (e: Exception) {
            Log.e(TAG, "❌ Stop recording failed: ${e.message}")
            replyTo(message.event)
        }
    }

    // MARK: - 미리듣기 재생

    private fun handlePlayAudio(message: Message) {
        Log.d(TAG, "🎵 Playing audio...")

        if (recordingFile == null || !recordingFile!!.exists()) {
            Log.e(TAG, "❌ No recording file found")
            replyTo(message.event)
            return
        }

        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(recordingFile!!.absolutePath)
                prepare()
                start()

                // 재생 완료 리스너
                setOnCompletionListener {
                    Log.d(TAG, "🎵 Audio playback finished")
                    replyTo("playAudio", PlaybackFinishedResponse(true))
                }
            }

            Log.d(TAG, "✅ Audio playing, duration: ${mediaPlayer?.duration?.div(1000.0)}s")
            replyTo(message.event)

        } catch (e: IOException) {
            Log.e(TAG, "❌ Playback failed: ${e.message}")
            replyTo(message.event)
        }
    }

    // MARK: - 미리듣기 일시정지

    private fun handlePauseAudio(message: Message) {
        mediaPlayer?.pause()
        Log.d(TAG, "⏸️ Audio paused")
        replyTo(message.event)
    }

    // MARK: - 미리듣기 중지

    private fun handleStopAudio(message: Message) {
        mediaPlayer?.apply {
            stop()
            release()
        }
        mediaPlayer = null
        Log.d(TAG, "⏹️ Audio stopped")
        replyTo(message.event)
    }

    // MARK: - 오디오 데이터 가져오기 (Base64)

    private fun handleGetAudioData(message: Message) {
        Log.d(TAG, "📦 Getting audio data...")

        if (recordingFile == null || !recordingFile!!.exists()) {
            Log.e(TAG, "❌ No recording found")
            replyTo(message.event)
            return
        }

        try {
            val bytes = recordingFile!!.readBytes()
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

            Log.d(TAG, "✅ Audio data encoded: ${bytes.size} bytes → ${base64.length} chars")

            // Base64 데이터를 JavaScript로 전송
            replyTo(message.event, AudioDataResponse(base64))

        } catch (e: IOException) {
            Log.e(TAG, "❌ Failed to read audio file: ${e.message}")
            replyTo(message.event)
        }
    }

    // MARK: - 권한 확인

    private fun checkMicrophonePermission(): Boolean {
        val context = delegate.destination.fragment.requireContext()
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    // MARK: - Response Data Classes
    
    @Serializable
    data class StopRecordingResponse(val duration: Double)
    
    @Serializable
    data class AudioDataResponse(val audioData: String)
    
    @Serializable
    data class PlaybackFinishedResponse(val finished: Boolean)
}

