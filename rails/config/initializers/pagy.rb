# frozen_string_literal: true

# Pagy initializer file (8.0.0+)
# See https://ddnexus.github.io/pagy/docs/api/pagy

# Customize only what you really need and notice that the core Pagy works also without any of the following lines.

# Default variables
Pagy::DEFAULT[:items] = 20        # items per page
Pagy::DEFAULT[:size]  = [ 1, 4, 4, 1 ]   # nav bar links

# Better user experience handled automatically
require "pagy/extras/overflow"
Pagy::DEFAULT[:overflow] = :empty_page    # (other options: :last_page and :exception)

# Countless extra: For better performance, avoids COUNT(*) queries
require "pagy/extras/countless"
Pagy::DEFAULT[:cycle] = false

# Performance optimization
Pagy::DEFAULT[:count_args] = [ :all ]

