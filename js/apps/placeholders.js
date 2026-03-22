/* apps/placeholders.js — stub apps for future implementation */
function _ph(icon, name, desc) {
  return body => {
    body.innerHTML = `<div class="ph">
      <div class="ph-ic">${icon}</div>
      <div class="ph-nm">${name}</div>
      <div class="ph-ds">${desc}</div>
      <div class="ph-nt">Placeholder — full app coming in a later step</div>
    </div>`;
  };
}

Shell.register('store',    { title:'ArcOS Store',   icon:'🛍️', w:720, h:520, build:_ph('🛍️','ArcOS Store','Discover apps and packages') });
Shell.register('mail',     { title:'Mail',           icon:'📧', w:740, h:520, build:_ph('📧','Mail','Your inbox would appear here') });
Shell.register('photos',   { title:'Photos',         icon:'🖼️', w:680, h:480, build:_ph('🖼️','Photos','Browse your photo library') });
Shell.register('music',    { title:'Media Player',   icon:'🎵', w:660, h:460, build:_ph('🎵','Media Player','Music player coming soon') });
Shell.register('calendar', { title:'Calendar',       icon:'📅', w:600, h:500, build:_ph('📅','Calendar','Calendar coming soon') });
Shell.register('maps',     { title:'Maps',           icon:'🗺️', w:740, h:520, build:_ph('🗺️','Maps','Maps coming soon') });
