import { memo } from 'react';

const GRADIENTS = [
  'linear-gradient(135deg,#4F46E5,#7C3AED)',
  'linear-gradient(135deg,#0EA5E9,#6366F1)',
  'linear-gradient(135deg,#10B981,#059669)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#EC4899,#8B5CF6)',
  'linear-gradient(135deg,#14B8A6,#0EA5E9)',
  'linear-gradient(135deg,#8B5CF6,#EC4899)',
];

function gradient(name = '') {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[seed % GRADIENTS.length];
}

function initials(firstName = '', lastName = '') {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
}

const SIZE_CLS = {
  xs:  'w-7 h-7 text-[10px] rounded-lg',
  sm:  'w-9 h-9 text-xs rounded-xl',
  md:  'w-11 h-11 text-sm rounded-xl',
  lg:  'w-14 h-14 text-base rounded-2xl',
  xl:  'w-20 h-20 text-xl rounded-2xl',
};

/**
 * Avatar with photo fallback to gradient initials.
 *
 * <Avatar src={p.photoUrl} firstName={p.firstName} lastName={p.lastName} size="md" />
 */
const Avatar = memo(function Avatar({ src, firstName, lastName, size = 'md', className = '' }) {
  const cls = `${SIZE_CLS[size] || SIZE_CLS.md} flex-shrink-0 flex items-center justify-center font-bold text-white object-cover ${className}`;

  if (src) {
    return <img src={src} alt={`${firstName} ${lastName}`} className={`${cls} object-cover`} />;
  }

  return (
    <div className={cls} style={{ background: gradient(`${firstName}${lastName}`) }}>
      {initials(firstName, lastName)}
    </div>
  );
});

export default Avatar;
export { gradient as avatarGradient };
