# Active Storage 캐싱 최적화
Rails.application.config.after_initialize do
  # Active Storage의 disk service에서 파일 제공 시 캐싱 헤더 추가
  ActiveStorage::DiskController.class_eval do
    before_action :set_cache_headers

    private

    def set_cache_headers
      # 오디오 파일에 대한 강력한 캐싱 헤더 설정
      # 브라우저가 1시간 동안 파일을 로컬 캐시에 저장
      response.headers["Cache-Control"] = "public, max-age=3600, immutable"
      response.headers["Expires"] = 1.hour.from_now.httpdate
    end
  end
end

