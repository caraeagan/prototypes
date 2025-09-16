const fs = require('fs');
const path = require('path');

// SVG generation functions (extracted from the React component)
const colorMap = {
  'red': { fill: '#DC2626', stroke: '#B91C1C' },
  'blue': { fill: '#2563EB', stroke: '#1D4ED8' },
  'yellow': { fill: '#EAB308', stroke: '#CA8A04' },
  'green': { fill: '#16A34A', stroke: '#15803D' },
  'orange': { fill: '#EA580C', stroke: '#C2410C' },
  'purple': { fill: '#9333EA', stroke: '#7C3AED' },
  'pink': { fill: '#EC4899', stroke: '#DB2777' },
  'indigo': { fill: '#4F46E5', stroke: '#4338CA' },
  'teal': { fill: '#0D9488', stroke: '#0F766E' },
  'cyan': { fill: '#0891B2', stroke: '#0E7490' },
  'lime': { fill: '#65A30D', stroke: '#4D7C0F' },
  'emerald': { fill: '#059669', stroke: '#047857' },
  'violet': { fill: '#7C3AED', stroke: '#6D28D9' },
  'fuchsia': { fill: '#C026D3', stroke: '#A21CAF' },
  'rose': { fill: '#E11D48', stroke: '#BE123C' },
  'amber': { fill: '#D97706', stroke: '#B45309' },
  'sky': { fill: '#0284C7', stroke: '#0369A1' },
  'slate': { fill: '#475569', stroke: '#334155' },
  'coral': { fill: '#FF6B6B', stroke: '#EE5A52' },
  'turquoise': { fill: '#06B6D4', stroke: '#0891B2' },
  'lavender': { fill: '#A78BFA', stroke: '#8B5CF6' },
  'mint': { fill: '#34D399', stroke: '#10B981' },
  'peach': { fill: '#FB923C', stroke: '#EA580C' },
  'navy': { fill: '#1E40AF', stroke: '#1D4ED8' },
  'maroon': { fill: '#991B1B', stroke: '#7F1D1D' },
  'gold': { fill: '#F59E0B', stroke: '#D97706' },
  'crimson': { fill: '#DC143C', stroke: '#B91C1C' },
  'aqua': { fill: '#06B6D4', stroke: '#0891B2' },
  'lightblue': { fill: '#7DD3FC', stroke: '#38BDF8' },
  'darkblue': { fill: '#1E3A8A', stroke: '#1E40AF' }
};

function generateShapeDescription(item) {
  if (!item) return 'empty';
  
  let description = [];
  
  if (item.size) description.push(item.size);
  if (item.color && item.color !== 'split') description.push(item.color);
  if (item.topColor && item.bottomColor) description.push(`${item.topColor}_${item.bottomColor}`);
  if (item.shape) description.push(item.shape);
  if (item.count && item.count > 1) description.push(`x${item.count}`);
  if (item.rotation) description.push(`rot${item.rotation}`);
  if (item.reflected) description.push('reflected');
  if (item.style) description.push(item.style);
  if (item.modifier) description.push(item.modifier);
  if (item.direction) description.push(item.direction);
  if (item.dotCount) description.push(`${item.dotCount}dots`);
  
  return description.join('_') || 'unknown';
}

function generateSVGTile(item, isQuestionMark = false, isSelected = false, size = 'large') {
  const tileSize = size === 'small' ? 80 : 96;
  const borderWidth = 2;
  const cornerRadius = 12;
  
  // Determine tile colors based on state
  let fillColor = '#FFFFFF';
  let strokeColor = '#D1D5DB';
  let strokeDashArray = '';
  
  if (isQuestionMark && !item) {
    fillColor = '#DBEAFE';
    strokeColor = '#1E3A8A';
    strokeDashArray = '5,5';
  } else if (isSelected) {
    fillColor = '#DBEAFE';
    strokeColor = '#1E3A8A';
  }
  
  let content = '';
  
  if (item) {
    content = generateShapeContent(item);
  } else if (isQuestionMark) {
    content = `<text x="${tileSize / 2}" y="${tileSize / 2}" text-anchor="middle" dominant-baseline="central" font-size="32" font-weight="bold" fill="#1E3A8A">?</text>`;
  }
  
  return `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${tileSize - borderWidth}" height="${tileSize - borderWidth}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${borderWidth}" stroke-dasharray="${strokeDashArray}"/>
    <g transform="translate(${tileSize / 2}, ${tileSize / 2})">
      ${content}
    </g>
  </svg>`;
}

function generateShapeContent(item) {
  if (!item) return '';
  
  const colors = colorMap[item.color] || { fill: '#2563EB', stroke: '#1D4ED8' };
  const size = item.size === 'big' ? 50 : 
               item.size === 'small' ? 35 : 
               item.size === 'medium' ? 42 :
               item.size === 'tiny' ? 28 :
               item.size === 'bigger' ? 55 : 42;
  
  const viewBox = 70;
  let centerX = viewBox / 2;
  let centerY = viewBox / 2;
  
  // Adjust positioning if needed
  if (item.position) {
    switch (item.position) {
      case 'top':
        centerY = viewBox / 3;
        break;
      case 'bottom':
        centerY = (viewBox * 2) / 3;
        break;
      case 'left':
        centerX = viewBox / 3;
        break;
      case 'right':
        centerX = (viewBox * 2) / 3;
        break;
    }
  }
  
  // Adjust coordinates to center around (0,0) for the tile
  centerX = centerX - viewBox / 2;
  centerY = centerY - viewBox / 2;
  
  switch (item.shape) {
    case 'circle':
      return generateCircleContent(item, colors, size, centerX, centerY);
    case 'square':
      return generateSquareContent(item, colors, size, centerX, centerY);
    case 'triangle':
      return generateTriangleContent(item, colors, size, centerX, centerY);
    case 'diamond':
      return generateDiamondContent(item, colors, size, centerX, centerY);
    case 'star':
      return generateStarContent(item, colors, size, centerX, centerY);
    case 'heart':
      return generateHeartContent(item, colors, size, centerX, centerY);
    case 'hexagon':
      return generateHexagonContent(item, colors, size, centerX, centerY);
    default:
      return `<circle cx="${centerX}" cy="${centerY}" r="10" fill="${colors.fill}" stroke="${colors.stroke}"/>`;
  }
}

function generateCircleContent(item, colors, size, centerX, centerY) {
  const count = item.count || 1;
  let content = '';
  
  if (count > 1) {
    const positions = [];
    if (count === 2) {
      positions.push({ x: centerX - size/4, y: centerY });
      positions.push({ x: centerX + size/4, y: centerY });
    } else if (count === 3) {
      positions.push({ x: centerX, y: centerY - size/4 });
      positions.push({ x: centerX - size/4, y: centerY + size/4 });
      positions.push({ x: centerX + size/4, y: centerY + size/4 });
    }
    
    positions.forEach(pos => {
      content += `<circle cx="${pos.x}" cy="${pos.y}" r="${size/4}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
    });
  } else {
    const transform = item.reflected ? `scale(-1, 1) translate(${-2 * centerX}, 0)` : '';
    content = `<circle cx="${centerX}" cy="${centerY}" r="${size/2}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
  }
  
  return content;
}

function generateSquareContent(item, colors, size, centerX, centerY) {
  const transform = item.reflected ? `scale(-1, 1) translate(${-2 * centerX}, 0)` : '';
  return `<rect x="${centerX - size/2}" y="${centerY - size/2}" width="${size}" height="${size}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2" rx="3" transform="${transform}"/>`;
}

function generateTriangleContent(item, colors, size, centerX, centerY) {
  const rotation = item.rotation || 0;
  const transform = item.reflected ? 
    `rotate(${rotation} ${centerX} ${centerY}) scale(-1, 1) translate(${-2 * centerX}, 0)` : 
    `rotate(${rotation} ${centerX} ${centerY})`;
  
  return `<polygon points="${centerX},${centerY - size/2} ${centerX + size/2},${centerY + size/2} ${centerX - size/2},${centerY + size/2}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
}

function generateDiamondContent(item, colors, size, centerX, centerY) {
  if (item.color === 'split' && item.topColor && item.bottomColor) {
    const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' };
    const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' };
    const transform = item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : '';
    
    return `<g transform="${transform}">
      <polygon points="${centerX},${centerY - size/2} ${centerX + size/2},${centerY} ${centerX},${centerY} ${centerX - size/2},${centerY}" fill="${topColors.fill}" stroke="${colors.stroke}" stroke-width="2"/>
      <polygon points="${centerX - size/2},${centerY} ${centerX},${centerY} ${centerX + size/2},${centerY} ${centerX},${centerY + size/2}" fill="${bottomColors.fill}" stroke="${colors.stroke}" stroke-width="2"/>
    </g>`;
  }
  
  const transform = item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : '';
  return `<polygon points="${centerX},${centerY - size/2} ${centerX + size/2},${centerY} ${centerX},${centerY + size/2} ${centerX - size/2},${centerY}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
}

function generateStarContent(item, colors, size, centerX, centerY) {
  const starSize = size / 2;
  const innerRadius = starSize * 0.4;
  let points = '';
  
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? starSize : innerRadius;
    const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
    const y = centerY + Math.sin(angle - Math.PI / 2) * radius;
    points += `${x},${y} `;
  }
  
  return `<polygon points="${points}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1"/>`;
}

function generateHeartContent(item, colors, size, centerX, centerY) {
  const heartDirection = item.direction || 'up';
  let transform = '';
  
  switch (heartDirection) {
    case 'down':
      transform = `rotate(180 ${centerX} ${centerY})`;
      break;
    case 'left':
      transform = `rotate(270 ${centerX} ${centerY})`;
      break;
    case 'right':
      transform = `rotate(90 ${centerX} ${centerY})`;
      break;
    case 'up':
    default:
      transform = `rotate(180 ${centerX} ${centerY})`;
      break;
  }
  
  return `<path d="M${centerX},${centerY + size * 0.3} C${centerX - size * 0.5},${centerY - size * 0.1} ${centerX - size * 0.5},${centerY - size * 0.5} ${centerX},${centerY - size * 0.2} C${centerX + size * 0.5},${centerY - size * 0.5} ${centerX + size * 0.5},${centerY - size * 0.1} ${centerX},${centerY + size * 0.3}Z" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
}

function generateHexagonContent(item, colors, size, centerX, centerY) {
  const transform = item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : '';
  const hexPoints = `${centerX + size/2},${centerY} ${centerX + size/4},${centerY - size/2} ${centerX - size/4},${centerY - size/2} ${centerX - size/2},${centerY} ${centerX - size/4},${centerY + size/2} ${centerX + size/4},${centerY + size/2}`;
  
  let content = `<polygon points="${hexPoints}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
  
  // Add dots if specified
  const dotCount = item.dotCount || 0;
  if (dotCount > 0) {
    for (let i = 0; i < dotCount; i++) {
      let dotX, dotY;
      if (dotCount === 1) {
        dotX = centerX;
        dotY = centerY;
      } else if (dotCount === 2) {
        dotX = centerX + (i === 0 ? -8 : 8);
        dotY = centerY;
      } else if (dotCount === 3) {
        dotX = centerX + (i === 1 ? -8 : i === 2 ? 8 : 0);
        dotY = centerY + (i === 0 ? -8 : 8);
      } else {
        const angle = (i * 2 * Math.PI) / dotCount;
        dotX = centerX + Math.cos(angle) * 10;
        dotY = centerY + Math.sin(angle) * 10;
      }
      content += `<circle cx="${dotX}" cy="${dotY}" r="3" fill="black"/>`;
    }
  }
  
  return content;
}

// Pattern reasoning questions data (extracted from the component)
const QUESTION_GROUPS = {
  "2.5-3.5": {
    title: "Ages 2.5-3.5 (Early Pre-K)",
    questions: [
      {
        id: 1,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { color: "red", shape: "circle", label: "Red circle" },
          { color: "red", shape: "circle", label: "Red circle" }
        ],
        options: [
          { id: "1", color: "blue", shape: "circle", label: "Blue circle" },
          { id: "2", color: "yellow", shape: "circle", label: "Yellow circle" },
          { id: "3", color: "green", shape: "circle", label: "Green circle" },
          { id: "4", color: "red", shape: "circle", label: "Red circle" }
        ]
      },
      {
        id: 2,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { color: "blue", shape: "square", label: "Blue square" },
          { color: "blue", shape: "square", label: "Blue square" }
        ],
        options: [
          { id: "1", color: "yellow", shape: "square", label: "Yellow square" },
          { id: "2", color: "blue", shape: "square", label: "Blue square" },
          { id: "3", color: "red", shape: "square", label: "Red square" },
          { id: "4", color: "green", shape: "square", label: "Green square" }
        ]
      }
      // Add more questions as needed
    ]
  },
  "10-11": {
    title: "Ages 10-11",
    questions: [
      {
        id: 35,
        ageGroup: "10-11",
        type: "rotation_sequence",
        question: "A diamond rotates 90° clockwise each step. The blue half points up, right, down… What comes next?",
        sequence: [
          { shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 0, size: "medium" },
          { shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 90, size: "medium" },
          { shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 180, size: "medium" }
        ],
        options: [
          { id: "1", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 270, size: "medium", label: "Left" },
          { id: "2", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 0, size: "medium", label: "Up" },
          { id: "3", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 90, size: "medium", label: "Right" },
          { id: "4", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 180, size: "medium", label: "Down" }
        ]
      },
      {
        id: 36,
        ageGroup: "10-11",
        type: "flip_rotate_pattern",
        question: "A triangle flips horizontally, then rotates 180°, then flips again (pattern repeats). If the last position was 'pointing left,' what comes next?",
        sequence: [
          { shape: "triangle", color: "green", rotation: 0, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 90, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 270, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 180, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 0, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 90, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 270, reflected: false, size: "medium" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "green", rotation: 0, reflected: false, size: "medium", label: "Pointing up" },
          { id: "2", shape: "triangle", color: "green", rotation: 270, reflected: false, size: "medium", label: "Pointing right" },
          { id: "3", shape: "triangle", color: "green", rotation: 270, reflected: true, size: "medium", label: "Pointing left" },
          { id: "4", shape: "triangle", color: "green", rotation: 180, reflected: false, size: "medium", label: "Pointing down" }
        ]
      }
    ]
  }
};

// Generate all SVG files
function generateAllSVGs() {
  const outputDir = './pattern-reasoning-svgs';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  Object.values(QUESTION_GROUPS).forEach(group => {
    group.questions.forEach(question => {
      // Generate sequence SVGs
      question.sequence.forEach((item, index) => {
        const description = generateShapeDescription(item);
        const filename = `q_${question.id}_sequence_${index + 1}_${description}.svg`;
        const svg = generateSVGTile(item);
        
        fs.writeFileSync(path.join(outputDir, filename), svg);
        console.log(`Generated: ${filename}`);
      });
      
      // Generate option SVGs
      question.options.forEach(option => {
        const description = generateShapeDescription(option);
        const filename = `q_${question.id}_option_${option.id}_${description}.svg`;
        const svg = generateSVGTile(option);
        
        fs.writeFileSync(path.join(outputDir, filename), svg);
        console.log(`Generated: ${filename}`);
      });
      
      // Generate question mark SVG
      const questionMarkFilename = `q_${question.id}_question_mark.svg`;
      const questionMarkSvg = generateSVGTile(null, true);
      fs.writeFileSync(path.join(outputDir, questionMarkFilename), questionMarkSvg);
      console.log(`Generated: ${questionMarkFilename}`);
    });
  });
  
  console.log(`\nAll SVG files generated in ${outputDir}/`);
}

// Run the generation
generateAllSVGs();