import Foundation
import AVFoundation
import HotwireNative

final class AudioRecorderComponent: BridgeComponent {
    // Bridge Component 이름 (JavaScript에서 사용)
    override class var name: String { "audio-recorder" }
    
    // 녹음/재생 인스턴스
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingURL: URL?
    private var playbackTimer: Timer?
    
    // MARK: - Message Handling
    
    override func onReceive(message: Message) {
        print("🎤 AudioRecorderComponent received: \(message.event)")
        
        guard let event = Event(rawValue: message.event) else {
            print("❌ Unknown event: \(message.event)")
            return
        }
        
        switch event {
        case .startRecording:
            handleStartRecording(message: message)
        case .stopRecording:
            handleStopRecording(message: message)
        case .playAudio:
            handlePlayAudio(message: message)
        case .pauseAudio:
            handlePauseAudio(message: message)
        case .getAudioData:
            handleGetAudioData(message: message)
        }
    }
    
    // MARK: - 녹음 시작
    
    private func handleStartRecording(message: Message) {
        print("🎤 Starting recording...")
        
        // 1. 마이크 권한 확인 (iOS 버전별 분기)
        if #available(iOS 17.0, *) {
            checkPermissionIOS17(message: message)
        } else {
            checkPermissionLegacy(message: message)
        }
    }
    
    // iOS 17+ 권한 확인
    @available(iOS 17.0, *)
    private func checkPermissionIOS17(message: Message) {
        let permissionStatus = AVAudioApplication.shared.recordPermission
        print("🔐 [iOS 17+] Microphone permission status: \(permissionStatus.rawValue)")
        
        switch permissionStatus {
        case .undetermined:
            print("⚠️ Microphone permission not determined, requesting...")
            AVAudioApplication.requestRecordPermission { [weak self] granted in
                if granted {
                    print("✅ Microphone permission granted")
                    self?.startRecordingWithPermission(message: message)
                } else {
                    print("❌ Microphone permission denied")
                    self?.reply(to: "startRecording")
                }
            }
        case .denied:
            print("❌ Microphone permission denied by user")
            reply(to: "startRecording")
        case .granted:
            print("✅ Microphone permission already granted")
            startRecordingWithPermission(message: message)
        @unknown default:
            print("❌ Unknown permission status")
            reply(to: "startRecording")
        }
    }
    
    // iOS 16 이하 권한 확인
    @available(iOS, introduced: 13.0, deprecated: 17.0, message: "Use AVAudioApplication for iOS 17+")
    private func checkPermissionLegacy(message: Message) {
        let permissionStatus = AVAudioSession.sharedInstance().recordPermission
        print("🔐 [iOS 16-] Microphone permission status: \(permissionStatus.rawValue)")
        
        switch permissionStatus {
        case .undetermined:
            print("⚠️ Microphone permission not determined, requesting...")
            AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
                if granted {
                    print("✅ Microphone permission granted")
                    self?.startRecordingWithPermission(message: message)
                } else {
                    print("❌ Microphone permission denied")
                    self?.reply(to: "startRecording")
                }
            }
        case .denied:
            print("❌ Microphone permission denied by user")
            reply(to: "startRecording")
        case .granted:
            print("✅ Microphone permission already granted")
            startRecordingWithPermission(message: message)
        @unknown default:
            print("❌ Unknown permission status")
            reply(to: "startRecording")
        }
    }
    
    private func startRecordingWithPermission(message: Message) {
        // Documents 디렉토리에 파일 생성
        let documentsPath = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]
        
        print("📁 Documents directory: \(documentsPath)")
        
        let timestamp = Int(Date().timeIntervalSince1970)
        let fileURL = documentsPath.appendingPathComponent("recording_\(timestamp).m4a")
        recordingURL = fileURL
        
        print("📝 Recording file URL: \(fileURL)")
        
        // AAC 포맷 설정 (모노, 48 kbps, SNS 최적)
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,  // 모노 (더 안정적)
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            AVEncoderBitRateKey: 48000  // 48 kbps
        ]
        
        print("🎛️ Audio settings: \(settings)")
        
        do {
            // 오디오 세션 설정
            let audioSession = AVAudioSession.sharedInstance()
            print("🔊 Setting audio session category...")
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            print("🔊 Activating audio session...")
            try audioSession.setActive(true)
            print("✅ Audio session activated")
            
            // 녹음 준비 및 시작
            print("🎙️ Creating AVAudioRecorder...")
            audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
            
            guard let recorder = audioRecorder else {
                print("❌ Failed to create AVAudioRecorder")
                reply(to: "startRecording")
                return
            }
            
            print("✅ AVAudioRecorder created successfully")
            print("🎙️ Preparing to record...")
            
            let prepareResult = recorder.prepareToRecord()
            print("🎙️ Prepare result: \(prepareResult)")
            
            print("🎙️ Starting recording...")
            let recordingStarted = recorder.record()
            print("🎙️ Record() returned: \(recordingStarted)")
            
            if recordingStarted {
                print("✅ Recording started: \(fileURL.lastPathComponent)")
                print("📁 Recording path: \(fileURL.path)")
                print("⏱️ Recorder is recording: \(recorder.isRecording)")
                reply(to: "startRecording")
            } else {
                print("❌ Recording failed to start (record() returned false)")
                print("🔍 Recorder state - isRecording: \(recorder.isRecording)")
                reply(to: "startRecording")
            }
            
        } catch let error as NSError {
            print("❌ Recording setup failed")
            print("❌ Error domain: \(error.domain)")
            print("❌ Error code: \(error.code)")
            print("❌ Error description: \(error.localizedDescription)")
            print("❌ Error info: \(error.userInfo)")
            reply(to: "startRecording")
        }
    }
    
    // MARK: - 녹음 중지
    
    private func handleStopRecording(message: Message) {
        print("🎤 Stopping recording...")
        
        guard let recorder = audioRecorder else {
            print("❌ No active recording")
            reply(to: "stopRecording")
            return
        }
        
        let duration = recorder.currentTime
        recorder.stop()
        
        // 파일 존재 확인
        if let url = recordingURL {
            let fileExists = FileManager.default.fileExists(atPath: url.path)
            let fileSize = try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64
            print("✅ Recording stopped, duration: \(duration)s")
            print("📁 File exists: \(fileExists), size: \(fileSize ?? 0) bytes")
        }
        
        // Duration을 JavaScript로 전송
        let response = StopRecordingResponse(duration: duration)
        reply(to: "stopRecording", with: response)
    }
    
    // MARK: - 미리듣기 재생
    
    private func handlePlayAudio(message: Message) {
        print("🎵 Playing audio...")
        
        guard let url = recordingURL else {
            print("❌ No recording URL found")
            reply(to: "playAudio")
            return
        }
        
        // 파일 존재 확인
        guard FileManager.default.fileExists(atPath: url.path) else {
            print("❌ Recording file does not exist at path: \(url.path)")
            reply(to: "playAudio")
            return
        }
        
        do {
            // 파일 크기 확인
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            let fileSize = attributes[.size] as? Int64 ?? 0
            print("📁 Playing file: \(url.lastPathComponent), size: \(fileSize) bytes")
            
            // 오디오 세션 설정 (재생용)
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .default)
            try audioSession.setActive(true)
            
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.prepareToPlay()
            
            guard let player = audioPlayer else {
                print("❌ Failed to create audio player")
                reply(to: "playAudio")
                return
            }
            
            player.play()
            
            // 재생 완료 시 JavaScript로 알림을 보내기 위한 타이머 설정
            let duration = player.duration
            playbackTimer?.invalidate()
            playbackTimer = Timer.scheduledTimer(withTimeInterval: duration, repeats: false) { [weak self] _ in
                print("🎵 Audio playback finished (via timer)")
                let response = PlaybackFinishedResponse(finished: true)
                self?.reply(to: "playAudio", with: response)
            }
            
            print("✅ Audio playing, duration: \(duration)s")
            reply(to: "playAudio")
            
        } catch {
            print("❌ Playback failed: \(error.localizedDescription)")
            print("❌ File path: \(url.path)")
            reply(to: "playAudio")
        }
    }
    
    // MARK: - 미리듣기 일시정지
    
    private func handlePauseAudio(message: Message) {
        audioPlayer?.pause()
        playbackTimer?.invalidate()
        playbackTimer = nil
        print("⏸️ Audio paused")
        reply(to: "pauseAudio")
    }
    
    // MARK: - 오디오 데이터 가져오기 (Base64)
    
    private func handleGetAudioData(message: Message) {
        print("📦 Getting audio data...")
        
        guard let url = recordingURL else {
            print("❌ No recording found")
            reply(to: "getAudioData")
            return
        }
        
        do {
            let data = try Data(contentsOf: url)
            let base64 = data.base64EncodedString()
            
            print("✅ Audio data encoded: \(data.count) bytes → \(base64.count) chars")
            
            // Base64 데이터를 JavaScript로 전송
            let responseData = AudioDataResponse(audioData: base64)
            reply(to: "getAudioData", with: responseData)
            
        } catch {
            print("❌ Failed to read audio file: \(error.localizedDescription)")
            reply(to: "getAudioData")
        }
    }
    
    // MARK: - Event Enum
    
    private enum Event: String {
        case startRecording
        case stopRecording
        case playAudio
        case pauseAudio
        case getAudioData
    }
}

// MARK: - Response Data

private extension AudioRecorderComponent {
    struct StopRecordingResponse: Encodable {
        let duration: TimeInterval
    }
    
    struct AudioDataResponse: Encodable {
        let audioData: String
    }
    
    struct PlaybackFinishedResponse: Encodable {
        let finished: Bool
    }
}
