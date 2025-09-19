#!/usr/bin/env node

/**
 * SVG Generator for Current Pattern Reasoning Questions
 * Generates SVG files that match the actual question data in the application
 */

const fs = require('fs');
const path = require('path');

// Helper function to create SVG content
function createSVG(item, size = 100) {
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

  const colors = colorMap[item.color] || { fill: '#2563EB', stroke: '#1D4ED8' };
  const actualSize = item.size === 'big' ? 50 : 
                    item.size === 'small' ? 30 : 
                    item.size === 'medium' ? 42 :
                    item.size === 'tiny' ? 20 :
                    item.size === 'bigger' ? 65 : 42;

  let content = '';

  switch (item.shape) {
    case 'circle':
      content = `<circle cx="${size/2}" cy="${size/2}" r="${actualSize/2}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
      break;
    
    case 'square':
      content = `<rect x="${size/2 - actualSize/2}" y="${size/2 - actualSize/2}" width="${actualSize}" height="${actualSize}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" rx="3"/>`;
      break;
    
    case 'triangle':
      const points = `${size/2},${size/2 - actualSize/2} ${size/2 - actualSize/2},${size/2 + actualSize/2} ${size/2 + actualSize/2},${size/2 + actualSize/2}`;
      content = `<polygon points="${points}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
      break;
    
    case 'star':
      const starPoints = [];
      const outerRadius = actualSize / 2;
      const innerRadius = outerRadius * 0.4;
      const centerX = size / 2;
      const centerY = size / 2;
      
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        starPoints.push(`${x},${y}`);
      }
      
      if (item.color === 'split' && item.topColor && item.bottomColor) {
        const topColors = colorMap[item.topColor] || colors;
        const bottomColors = colorMap[item.bottomColor] || colors;
        const rotation = item.rotation || 0;
        
        content = `
          <defs>
            <clipPath id="leftHalf${rotation}">
              <rect x="${centerX - outerRadius}" y="${centerY - outerRadius}" width="${outerRadius}" height="${outerRadius * 2}" transform="rotate(${rotation} ${centerX} ${centerY})"/>
            </clipPath>
            <clipPath id="rightHalf${rotation}">
              <rect x="${centerX}" y="${centerY - outerRadius}" width="${outerRadius}" height="${outerRadius * 2}" transform="rotate(${rotation} ${centerX} ${centerY})"/>
            </clipPath>
          </defs>
          <polygon points="${starPoints.join(' ')}" fill="${topColors.fill}" clip-path="url(#leftHalf${rotation})"/>
          <polygon points="${starPoints.join(' ')}" fill="${bottomColors.fill}" clip-path="url(#rightHalf${rotation})"/>
        `;
      } else {
        content = `<polygon points="${starPoints.join(' ')}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
      }
      break;
    
    case 'heart':
      const heartSize = actualSize;
      const heartPath = `M${size/2},${size/2 + heartSize * 0.3} C${size/2 - heartSize * 0.5},${size/2 - heartSize * 0.1} ${size/2 - heartSize * 0.5},${size/2 - heartSize * 0.5} ${size/2},${size/2 - heartSize * 0.2} C${size/2 + heartSize * 0.5},${size/2 - heartSize * 0.5} ${size/2 + heartSize * 0.5},${size/2 - heartSize * 0.1} ${size/2},${size/2 + heartSize * 0.3}Z`;
      
      let transform = '';
      if (item.reflected) {
        transform = `transform="scale(-1, 1) translate(-${size}, 0)"`;
      }
      
      content = `<path d="${heartPath}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" ${transform}/>`;
      break;
    
    case 'arrow':
      const arrowSize = actualSize * 1.2;
      const strokeWidth = item.strokeWidth === 1 ? 0.01 : item.strokeWidth === 3 ? 5 : 2;
      const arrowPath = `M ${size/2 - arrowSize/1.5} ${size/2 - arrowSize/6} L ${size/2 + arrowSize/3} ${size/2 - arrowSize/6} L ${size/2 + arrowSize/3} ${size/2 - arrowSize/3} L ${size/2 + arrowSize/1.5} ${size/2} L ${size/2 + arrowSize/3} ${size/2 + arrowSize/3} L ${size/2 + arrowSize/3} ${size/2 + arrowSize/6} L ${size/2 - arrowSize/1.5} ${size/2 + arrowSize/6} Z`;
      
      let arrowTransform = '';
      if (item.reflected) {
        arrowTransform = `transform="scale(-1, 1) translate(-${size}, 0)"`;
      }
      
      content = `<path d="${arrowPath}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="${strokeWidth}" ${arrowTransform}/>`;
      break;
    
    case 'dots':
      const dotCount = item.count || 1;
      const dotRadius = 4;
      const spacing = 12;
      let dotContent = '';
      
      if (dotCount <= 5) {
        // Single row
        const startX = size/2 - (dotCount - 1) * spacing / 2;
        for (let i = 0; i < dotCount; i++) {
          dotContent += `<circle cx="${startX + i * spacing}" cy="${size/2}" r="${dotRadius}" fill="${colors.fill}"/>`;
        }
      } else {
        // Multiple rows
        const cols = Math.ceil(Math.sqrt(dotCount));
        const rows = Math.ceil(dotCount / cols);
        const startX = size/2 - (cols - 1) * spacing / 2;
        const startY = size/2 - (rows - 1) * spacing / 2;
        
        for (let i = 0; i < dotCount; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          dotContent += `<circle cx="${startX + col * spacing}" cy="${startY + row * spacing}" r="${dotRadius}" fill="${colors.fill}"/>`;
        }
      }
      content = dotContent;
      break;
    
    default:
      // Default to circle
      content = `<circle cx="${size/2}" cy="${size/2}" r="${actualSize/2}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
${content}
</svg>`;
}

// Sample current questions data structure (you'll need to copy your actual data here)
const CURRENT_QUESTIONS = [
  {
    id: 15,
    sequence: [
      { shape: "circle", color: "green" },
      { shape: "square", color: "purple" },
      { shape: "triangle", color: "orange" },
      { shape: "circle", color: "green" },
      { shape: "square", color: "purple" }
    ],
    options: [
      { id: "1", shape: "triangle", color: "orange" },
      { id: "2", shape: "circle", color: "green" },
      { id: "3", shape: "star", color: "yellow" },
      { id: "4", shape: "square", color: "purple" }
    ]
  },
  // Add more questions here as needed...
];

// Generate SVGs
function generateAllSVGs() {
  console.log('🎨 Generating SVG files from current question data...');
  
  let totalGenerated = 0;
  
  CURRENT_QUESTIONS.forEach(question => {
    console.log(`📝 Processing Question ${question.id}...`);
    
    // Generate sequence SVGs
    if (question.sequence) {
      question.sequence.forEach((item, index) => {
        if (item) {
          const filename = `q_${String(question.id).padStart(2, '0')}_sequence_${index + 1}_${item.color || 'default'}_${item.shape}.svg`;
          const svgContent = createSVG(item);
          
          fs.writeFileSync(path.join(__dirname, 'pattern-reasoning-svgs', filename), svgContent);
          totalGenerated++;
        }
      });
    }
    
    // Generate grid SVGs (for matrix questions)
    if (question.grid) {
      question.grid.forEach((row, rowIndex) => {
        row.forEach((item, colIndex) => {
          if (item) {
            const filename = `q_${String(question.id).padStart(2, '0')}_grid_r${rowIndex + 1}c${colIndex + 1}_${item.color || 'default'}_${item.shape}.svg`;
            const svgContent = createSVG(item);
            
            fs.writeFileSync(path.join(__dirname, 'pattern-reasoning-svgs', filename), svgContent);
            totalGenerated++;
          }
        });
      });
    }
    
    // Generate option SVGs
    if (question.options) {
      question.options.forEach(option => {
        const filename = `q_${String(question.id).padStart(2, '0')}_option_${option.id}_${option.color || 'default'}_${option.shape}.svg`;
        const svgContent = createSVG(option);
        
        fs.writeFileSync(path.join(__dirname, 'pattern-reasoning-svgs', filename), svgContent);
        totalGenerated++;
      });
    }
    
    // Generate question mark
    const questionMarkSVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="48" font-weight="bold" fill="#1E3A8A">?</text>
</svg>`;
    
    const qMarkFilename = `q_${String(question.id).padStart(2, '0')}_question_mark.svg`;
    fs.writeFileSync(path.join(__dirname, 'pattern-reasoning-svgs', qMarkFilename), questionMarkSVG);
    totalGenerated++;
  });
  
  console.log(`✅ Generated ${totalGenerated} SVG files successfully!`);
  console.log(`📁 Files saved to: ./pattern-reasoning-svgs/`);
}

// Run the generator
if (require.main === module) {
  generateAllSVGs();
}

module.exports = { createSVG, generateAllSVGs };