module Base64Decoder
  def self.decode_base64_data(base64_data)
    return nil unless base64_data.include?("base64")
    content_data = base64_data.split(",")[1]

    decoded_image = Base64.decode64(content_data)

    StringIO.new(decoded_image)
  end
end
