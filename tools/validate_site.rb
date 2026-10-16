#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'uri'

ROOT = File.expand_path('..', __dir__)
DATA_FILES = {
  File.join(ROOT, '_data', 'goodies.yml') => %w[name category description image],
  File.join(ROOT, '_data', 'page_designs.yml') => %w[name category description image pdf]
}.freeze
LOCAL_REF_FIELDS = %w[image iframe_url pdf].freeze

def local_path(value)
  return nil if value.nil? || value.match?(%r{\A(?:[a-z]+:)?//}i)

  value.sub(%r{\A/}, '').split(/[?#]/, 2).first
end

def require_file(path, label)
  return if File.file?(path)

  warn "Missing #{label}: #{path.sub(ROOT + File::SEPARATOR, '')}"
  $failures += 1
end

$failures = 0
$total = 0

# Soft performance warnings (do not abort - they indicate size debt, not breakage)
Dir['assets/img/goodies/*.png'].each do |f|
  warn "preview large (>300KB): #{f} (#{File.size(f) / 1024} KB)" if File.size(f) > 300 * 1024
  warn "webp missing: #{f}" unless File.exist?(f.sub(/\.png$/, '.webp'))
end

DATA_FILES.each do |data_file, fields|
  label = File.basename(data_file, '.yml')
  items = YAML.safe_load(File.read(data_file), permitted_classes: [], aliases: false)
  unless items.is_a?(Array) && !items.empty?
    abort "Expected #{data_file} to contain at least one entry"
  end

  items.each_with_index do |item, index|
    fields.each do |field|
      warn "#{label} ##{index + 1} is missing #{field}" unless item[field].is_a?(String) && !item[field].empty?
      $failures += 1 unless item[field].is_a?(String) && !item[field].empty?
    end

    LOCAL_REF_FIELDS.each do |field|
      next unless item[field].is_a?(String) && !item[field].empty?

      if (path = local_path(item[field]))
        require_file(File.join(ROOT, path), "#{field} for #{item['name'] || "#{label} ##{index + 1}"}")
      end
    end
  end
  $total += items.length
end

goodies_page = File.read(File.join(ROOT, '_tabs', 'goodies.html'))
abort 'Goodies page must load the external goodies module' unless goodies_page.include?('/assets/js/goodies.js')
abort 'Goodies page must expose serialized goodies data' unless goodies_page.include?('id="goodies-data"')
abort 'Goodies page must load the shared collection-grid module first' unless goodies_page.index('/assets/js/collection-grid.js')&.<(goodies_page.index('/assets/js/goodies.js'))
abort 'Goodies page must load the segmented-control engine before goodies.js' unless goodies_page.index('/assets/js/rubber-segment.js')&.<(goodies_page.index('/assets/js/goodies.js'))
abort 'Goodies page must ship the grid/list view toggle markup' unless goodies_page.match?(/class="[^"]*\bview-toggle\b/)
# The scrim needs a base list-view rule and a 576px phone override; one
# without the other leaves the cover gradient pointing the wrong way.
list_view_scrim_rules = goodies_page.scan(/#goodies-grid\.list-view \.goodie-card:not\(\.is-layout-from\) > \.card-cover::after \{/).length
abort "Goodies page must style the list-view cover scrim in both layouts (found #{list_view_scrim_rules})" if list_view_scrim_rules < 2
# The morph's frozen copy is a child of the live card, so every live list-view
# rule that reaches into a card has to be both scoped away from the copy and a
# child selector - a descendant selector would reach straight through the copy
# and restyle its cover and text along with the card's. Checked as "none is
# missing either guard" rather than as a tally, so adding a list-view rule stays
# a one-line change.
bare_scoped_rules = goodies_page.scan(/#goodies-grid\.list-view \.goodie-card(?!:not\(\.is-layout-from\))[^{]*\{/).length
abort "Goodies list-view card rules must exclude the morph's frozen copy (found #{bare_scoped_rules} without it)" if bare_scoped_rules.positive?
leaky_scoped_rules = goodies_page.scan(/#goodies-grid\.list-view \.goodie-card:not\(\.is-layout-from\) [^>{][^{]*\{/).length
abort "Goodies list-view rules must use a child combinator (found #{leaky_scoped_rules} that do not)" if leaky_scoped_rules.positive?

designs_page = File.read(File.join(ROOT, 'collections', 'page-designs.html'))
abort 'Designs page must load the external page-designs module' unless designs_page.include?('/assets/js/page-designs.js')
abort 'Designs page must expose serialized designs data' unless designs_page.include?('id="pdesigns-data"')
abort 'Designs page must load the shared collection-grid module first' unless designs_page.index('/assets/js/collection-grid.js')&.<(designs_page.index('/assets/js/page-designs.js'))

if $failures.positive?
  abort "Site validation failed with #{$failures} error(s)"
end

puts "Validated #{$total} entries and all local references."
