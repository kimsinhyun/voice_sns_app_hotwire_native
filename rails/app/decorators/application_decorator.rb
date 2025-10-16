class ApplicationDecorator < Draper::Decorator
  # Define methods for all decorators here

  delegate_all

  # For example:
  # def created_at
  #   helpers.content_tag :span, class: 'time' do
  #     object.created_at.strftime("%a %m/%d/%y")
  #   end
  # end
end
