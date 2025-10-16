module StorageHelper
  def cdn_storage(attachment)
    return nil unless attachment&.attached?

    if Rails.application.config.active_storage.service.in? [ :local, :test ]
      # 로컬/테스트 환경에서는 만료 시간 없는 URL 생성
      if attachment.is_a?(ActiveStorage::VariantWithRecord) || attachment.is_a?(ActiveStorage::Variant) || attachment.is_a?(ActiveStorage::Preview)
        # variant나 preview인 경우
        Rails.application.routes.url_helpers.rails_representation_url(attachment, only_path: false, expires_in: nil)
      else
        # 원본 파일인 경우
        Rails.application.routes.url_helpers.rails_blob_url(attachment, only_path: false, expires_in: nil)
      end
    elsif Rails.application.config.active_storage.service == :amazon
      # 프로덕션 환경에서는 CDN 사용
      if attachment.is_a?(ActiveStorage::VariantWithRecord) || attachment.is_a?(ActiveStorage::Variant) || attachment.is_a?(ActiveStorage::Preview)
        # variant인 경우 processed.key 사용
        "#{ENV['CDN_HOST']}/#{attachment.processed.key}"
      else
        # 원본인 경우 blob.key 사용
        "#{ENV['CDN_HOST']}/#{attachment.blob.key}"
      end
    else
      # 기본 fallback - 만료 시간을 길게 설정 (24시간)
      Rails.application.routes.url_helpers.url_for(attachment.respond_to?(:url) ? attachment : attachment.blob, expires_in: 24.hours)
    end
  end
end
