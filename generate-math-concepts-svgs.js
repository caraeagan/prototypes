const fs = require('fs');
const path = require('path');

// Math concepts questions with visual elements
const MATH_CONCEPTS_QUESTIONS = {
  "basic-arithmetic": {
    ageRange: "6-8",
    questions: [
      {
        id: 1,
        question: "The temperature outside rises from 60 °F at 8 AM to 80 °F at 12 PM. What is the average rate of change in degrees per hour?",
        correctAnswer: "5",
        type: "numeric",
        visualElements: [
          {
            type: "thermometer",
            startTemp: 60,
            endTemp: 80,
            timeStart: "8 AM",
            timeEnd: "12 PM"
          },
          {
            type: "graph",
            xLabel: "Time (hours)",
            yLabel: "Temperature (°F)",
            points: [[0, 60], [4, 80]]
          }
        ]
      },
      {
        id: 2,
        question: "A rectangular garden has a length of 15 feet and a width of 8 feet. What is the area of the garden in square feet?",
        correctAnswer: "120",
        type: "numeric", 
        visualElements: [
          {
            type: "rectangle",
            width: 15,
            height: 8,
            showDimensions: true,
            showGrid: true
          }
        ]
      },
      {
        id: 3,
        question: "Sarah has $45. She buys 3 books that cost $12 each. How much money does she have left?",
        correctAnswer: "9",
        type: "numeric",
        visualElements: [
          {
            type: "money",
            startAmount: 45,
            items: [
              { name: "book", cost: 12, quantity: 3 }
            ]
          },
          {
            type: "equation",
            expression: "45 - (3 × 12) = ?"
          }
        ]
      }
    ]
  },
  "geometry": {
    ageRange: "8-10",
    questions: [
      {
        id: 4,
        question: "What is the perimeter of a square with side length 6 cm?",
        correctAnswer: "24",
        type: "numeric",
        visualElements: [
          {
            type: "square",
            sideLength: 6,
            showDimensions: true,
            unit: "cm"
          }
        ]
      },
      {
        id: 5,
        question: "A circle has a radius of 4 inches. What is the area? (Use π ≈ 3.14)",
        correctAnswer: "50.24",
        type: "numeric",
        visualElements: [
          {
            type: "circle",
            radius: 4,
            showRadius: true,
            unit: "inches"
          },
          {
            type: "formula",
            expression: "A = πr²"
          }
        ]
      }
    ]
  },
  "fractions": {
    ageRange: "9-11",
    questions: [
      {
        id: 6,
        question: "What is 3/4 + 1/8?",
        correctAnswer: "7/8",
        type: "fraction",
        visualElements: [
          {
            type: "fractionBar",
            numerator: 3,
            denominator: 4,
            label: "3/4"
          },
          {
            type: "fractionBar", 
            numerator: 1,
            denominator: 8,
            label: "1/8"
          },
          {
            type: "fractionBar",
            numerator: 7,
            denominator: 8,
            label: "Result",
            isResult: true
          }
        ]
      }
    ]
  }
};

// SVG generation functions
function generateThermometerSVG(element) {
  const { startTemp, endTemp, timeStart, timeEnd } = element;
  const width = 120;
  const height = 300;
  const bulbRadius = 15;
  const tubeWidth = 20;
  const scaleMin = 0;
  const scaleMax = 100;
  
  // Calculate positions
  const startPos = height - 40 - ((startTemp - scaleMin) / (scaleMax - scaleMin)) * (height - 80);
  const endPos = height - 40 - ((endTemp - scaleMin) / (scaleMax - scaleMin)) * (height - 80);
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Thermometer tube -->
      <rect x="${width/2 - tubeWidth/2}" y="20" width="${tubeWidth}" height="${height - 60}" 
            fill="#E5E7EB" stroke="#6B7280" stroke-width="2" rx="10"/>
      
      <!-- Temperature scale -->
      <g stroke="#6B7280" stroke-width="1" font-family="Arial" font-size="12">
        ${Array.from({length: 6}, (_, i) => {
          const temp = scaleMin + (i * (scaleMax - scaleMin) / 5);
          const y = height - 40 - (i / 5) * (height - 80);
          return `
            <line x1="${width/2 + tubeWidth/2}" y1="${y}" x2="${width/2 + tubeWidth/2 + 10}" y2="${y}"/>
            <text x="${width/2 + tubeWidth/2 + 15}" y="${y + 4}" fill="#374151">${temp}°F</text>
          `;
        }).join('')}
      </g>
      
      <!-- Mercury/liquid -->
      <rect x="${width/2 - tubeWidth/2 + 2}" y="${endPos}" width="${tubeWidth - 4}" 
            height="${height - 40 - endPos}" fill="#DC2626" rx="8"/>
      
      <!-- Bulb -->
      <circle cx="${width/2}" cy="${height - 25}" r="${bulbRadius}" 
              fill="#DC2626" stroke="#6B7280" stroke-width="2"/>
      
      <!-- Time labels -->
      <text x="10" y="40" font-family="Arial" font-size="14" font-weight="bold" fill="#1F2937">
        ${timeStart}: ${startTemp}°F
      </text>
      <text x="10" y="60" font-family="Arial" font-size="14" font-weight="bold" fill="#1F2937">
        ${timeEnd}: ${endTemp}°F
      </text>
      
      <!-- Arrow showing change -->
      <path d="M 85 ${startPos} L 85 ${endPos} M 80 ${endPos + 5} L 85 ${endPos} L 90 ${endPos + 5}" 
            stroke="#059669" stroke-width="2" fill="none"/>
    </svg>
  `;
}

function generateRectangleSVG(element) {
  const { width: rectWidth, height: rectHeight, showDimensions, showGrid } = element;
  const scale = 15; // pixels per unit
  const svgWidth = (rectWidth * scale) + 100;
  const svgHeight = (rectHeight * scale) + 100;
  const offsetX = 50;
  const offsetY = 50;
  
  let gridLines = '';
  if (showGrid) {
    // Vertical grid lines
    for (let i = 0; i <= rectWidth; i++) {
      const x = offsetX + (i * scale);
      gridLines += `<line x1="${x}" y1="${offsetY}" x2="${x}" y2="${offsetY + rectHeight * scale}" 
                          stroke="#D1D5DB" stroke-width="1" stroke-dasharray="2,2"/>`;
    }
    // Horizontal grid lines  
    for (let i = 0; i <= rectHeight; i++) {
      const y = offsetY + (i * scale);
      gridLines += `<line x1="${offsetX}" y1="${y}" x2="${offsetX + rectWidth * scale}" y2="${y}" 
                          stroke="#D1D5DB" stroke-width="1" stroke-dasharray="2,2"/>`;
    }
  }
  
  return `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      ${gridLines}
      
      <!-- Rectangle -->
      <rect x="${offsetX}" y="${offsetY}" width="${rectWidth * scale}" height="${rectHeight * scale}"
            fill="#93C5FD" stroke="#1D4ED8" stroke-width="3" fill-opacity="0.3"/>
      
      ${showDimensions ? `
        <!-- Width dimension -->
        <g stroke="#1F2937" stroke-width="2" font-family="Arial" font-size="14" font-weight="bold">
          <line x1="${offsetX}" y1="${offsetY - 20}" x2="${offsetX + rectWidth * scale}" y2="${offsetY - 20}"/>
          <line x1="${offsetX}" y1="${offsetY - 25}" x2="${offsetX}" y2="${offsetY - 15}"/>
          <line x1="${offsetX + rectWidth * scale}" y1="${offsetY - 25}" 
                x2="${offsetX + rectWidth * scale}" y2="${offsetY - 15}"/>
          <text x="${offsetX + (rectWidth * scale / 2)}" y="${offsetY - 25}" 
                text-anchor="middle" fill="#1F2937">${rectWidth} feet</text>
        </g>
        
        <!-- Height dimension -->
        <g stroke="#1F2937" stroke-width="2" font-family="Arial" font-size="14" font-weight="bold">
          <line x1="${offsetX - 20}" y1="${offsetY}" x2="${offsetX - 20}" y2="${offsetY + rectHeight * scale}"/>
          <line x1="${offsetX - 25}" y1="${offsetY}" x2="${offsetX - 15}" y2="${offsetY}"/>
          <line x1="${offsetX - 25}" y1="${offsetY + rectHeight * scale}" 
                x2="${offsetX - 15}" y2="${offsetY + rectHeight * scale}"/>
          <text x="${offsetX - 35}" y="${offsetY + (rectHeight * scale / 2)}" 
                text-anchor="middle" fill="#1F2937" transform="rotate(-90 ${offsetX - 35} ${offsetY + (rectHeight * scale / 2)})">${rectHeight} feet</text>
        </g>
      ` : ''}
      
      <!-- Area label -->
      <text x="${offsetX + (rectWidth * scale / 2)}" y="${offsetY + (rectHeight * scale / 2)}" 
            text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#1F2937">
        Area = ${rectWidth} × ${rectHeight} = ? sq ft
      </text>
    </svg>
  `;
}

function generateMoneySVG(element) {
  const { startAmount, items } = element;
  const width = 400;
  const height = 200;
  
  const totalCost = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const remaining = startAmount - totalCost;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Starting money -->
      <g transform="translate(20, 20)">
        <rect x="0" y="0" width="80" height="40" fill="#10B981" stroke="#047857" stroke-width="2" rx="5"/>
        <text x="40" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="white">
          $${startAmount}
        </text>
        <text x="40" y="55" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">
          Starting Amount
        </text>
      </g>
      
      <!-- Minus sign -->
      <text x="120" y="45" font-family="Arial" font-size="24" font-weight="bold" fill="#374151">-</text>
      
      <!-- Items purchased -->
      ${items.map((item, index) => `
        <g transform="translate(${150 + index * 90}, 20)">
          <rect x="0" y="0" width="70" height="40" fill="#EF4444" stroke="#DC2626" stroke-width="2" rx="5"/>
          <text x="35" y="15" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="white">
            ${item.quantity} ${item.name}${item.quantity > 1 ? 's' : ''}
          </text>
          <text x="35" y="30" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="white">
            $${item.cost * item.quantity}
          </text>
          <text x="35" y="55" text-anchor="middle" font-family="Arial" font-size="10" fill="#374151">
            ${item.quantity} × $${item.cost}
          </text>
        </g>
      `).join('')}
      
      <!-- Equals sign -->
      <text x="20" y="120" font-family="Arial" font-size="24" font-weight="bold" fill="#374151">=</text>
      
      <!-- Result -->
      <g transform="translate(60, 95)">
        <rect x="0" y="0" width="80" height="40" fill="#8B5CF6" stroke="#7C3AED" stroke-width="2" rx="5"/>
        <text x="40" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="white">
          $${remaining}
        </text>
        <text x="40" y="55" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">
          Money Left
        </text>
      </g>
      
      <!-- Calculation -->
      <text x="160" y="115" font-family="Arial" font-size="14" fill="#374151">
        $${startAmount} - $${totalCost} = $${remaining}
      </text>
    </svg>
  `;
}

function generateEquationSVG(element) {
  const { expression } = element;
  const width = 300;
  const height = 80;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
            fill="#F3F4F6" stroke="#D1D5DB" stroke-width="2" rx="10"/>
      <text x="${width/2}" y="${height/2 + 5}" text-anchor="middle" 
            font-family="Arial" font-size="18" font-weight="bold" fill="#1F2937">
        ${expression}
      </text>
    </svg>
  `;
}

function generateSquareSVG(element) {
  const { sideLength, showDimensions, unit } = element;
  const scale = 20;
  const svgSize = (sideLength * scale) + 100;
  const offset = 50;
  
  return `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
      <!-- Square -->
      <rect x="${offset}" y="${offset}" width="${sideLength * scale}" height="${sideLength * scale}"
            fill="#FBBF24" stroke="#D97706" stroke-width="3" fill-opacity="0.3"/>
      
      ${showDimensions ? `
        <!-- Top dimension -->
        <g stroke="#1F2937" stroke-width="2" font-family="Arial" font-size="14" font-weight="bold">
          <line x1="${offset}" y1="${offset - 20}" x2="${offset + sideLength * scale}" y2="${offset - 20}"/>
          <line x1="${offset}" y1="${offset - 25}" x2="${offset}" y2="${offset - 15}"/>
          <line x1="${offset + sideLength * scale}" y1="${offset - 25}" 
                x2="${offset + sideLength * scale}" y2="${offset - 15}"/>
          <text x="${offset + (sideLength * scale / 2)}" y="${offset - 25}" 
                text-anchor="middle" fill="#1F2937">${sideLength} ${unit}</text>
        </g>
        
        <!-- Left dimension -->
        <g stroke="#1F2937" stroke-width="2" font-family="Arial" font-size="14" font-weight="bold">
          <line x1="${offset - 20}" y1="${offset}" x2="${offset - 20}" y2="${offset + sideLength * scale}"/>
          <line x1="${offset - 25}" y1="${offset}" x2="${offset - 15}" y2="${offset}"/>
          <line x1="${offset - 25}" y1="${offset + sideLength * scale}" 
                x2="${offset - 15}" y2="${offset + sideLength * scale}"/>
          <text x="${offset - 35}" y="${offset + (sideLength * scale / 2)}" 
                text-anchor="middle" fill="#1F2937" 
                transform="rotate(-90 ${offset - 35} ${offset + (sideLength * scale / 2)})">${sideLength} ${unit}</text>
        </g>
      ` : ''}
      
      <!-- Perimeter label -->
      <text x="${offset + (sideLength * scale / 2)}" y="${offset + (sideLength * scale / 2)}" 
            text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#1F2937">
        Perimeter = 4 × ${sideLength} = ? ${unit}
      </text>
    </svg>
  `;
}

function generateCircleSVG(element) {
  const { radius, showRadius, unit } = element;
  const scale = 15;
  const svgSize = (radius * scale * 2) + 100;
  const center = svgSize / 2;
  
  return `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
      <!-- Circle -->
      <circle cx="${center}" cy="${center}" r="${radius * scale}"
              fill="#F472B6" stroke="#EC4899" stroke-width="3" fill-opacity="0.3"/>
      
      ${showRadius ? `
        <!-- Radius line -->
        <line x1="${center}" y1="${center}" x2="${center + radius * scale}" y2="${center}"
              stroke="#1F2937" stroke-width="2"/>
        <circle cx="${center}" cy="${center}" r="3" fill="#1F2937"/>
        <circle cx="${center + radius * scale}" cy="${center}" r="3" fill="#1F2937"/>
        
        <!-- Radius label -->
        <text x="${center + (radius * scale / 2)}" y="${center - 10}" 
              text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#1F2937">
          r = ${radius} ${unit}
        </text>
      ` : ''}
      
      <!-- Area label -->
      <text x="${center}" y="${center + radius * scale + 30}" 
            text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#1F2937">
        Area = πr² = π × ${radius}² = ?
      </text>
    </svg>
  `;
}

function generateFractionBarSVG(element) {
  const { numerator, denominator, label, isResult } = element;
  const width = 200;
  const height = 100;
  const barWidth = 160;
  const barHeight = 30;
  const segmentWidth = barWidth / denominator;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Fraction bar container -->
      <rect x="20" y="40" width="${barWidth}" height="${barHeight}" 
            fill="white" stroke="#6B7280" stroke-width="2"/>
      
      <!-- Filled segments -->
      ${Array.from({length: numerator}, (_, i) => `
        <rect x="${20 + i * segmentWidth}" y="40" width="${segmentWidth}" height="${barHeight}" 
              fill="${isResult ? '#10B981' : '#3B82F6'}" stroke="#6B7280" stroke-width="1"/>
      `).join('')}
      
      <!-- Segment dividers -->
      ${Array.from({length: denominator - 1}, (_, i) => `
        <line x1="${20 + (i + 1) * segmentWidth}" y1="40" 
              x2="${20 + (i + 1) * segmentWidth}" y2="70" 
              stroke="#6B7280" stroke-width="2"/>
      `).join('')}
      
      <!-- Fraction label -->
      <text x="100" y="25" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#1F2937">
        ${label}
      </text>
      
      <!-- Fraction notation -->
      <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="14" fill="#1F2937">
        ${numerator}/${denominator}
      </text>
    </svg>
  `;
}

function generateFormulaSVG(element) {
  const { expression } = element;
  const width = 200;
  const height = 60;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
            fill="#FEF3C7" stroke="#F59E0B" stroke-width="2" rx="8"/>
      <text x="${width/2}" y="${height/2 + 5}" text-anchor="middle" 
            font-family="Arial" font-size="16" font-weight="bold" fill="#92400E">
        ${expression}
      </text>
    </svg>
  `;
}

// Generate shape description for filename
function generateElementDescription(element) {
  switch (element.type) {
    case 'thermometer': return `thermometer_${element.startTemp}to${element.endTemp}F`;
    case 'rectangle': return `rectangle_${element.width}x${element.height}`;
    case 'money': return `money_${element.startAmount}_spent${element.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0)}`;
    case 'equation': return `equation_${element.expression.replace(/[^a-zA-Z0-9]/g, '_')}`;
    case 'square': return `square_side${element.sideLength}${element.unit}`;
    case 'circle': return `circle_radius${element.radius}${element.unit}`;
    case 'fractionBar': return `fraction_${element.numerator}_${element.denominator}`;
    case 'formula': return `formula_${element.expression.replace(/[^a-zA-Z0-9]/g, '_')}`;
    case 'graph': return `graph_temp_vs_time`;
    default: return element.type;
  }
}

// Generate SVG for each element type
function generateSVGForElement(element) {
  switch (element.type) {
    case 'thermometer': return generateThermometerSVG(element);
    case 'rectangle': return generateRectangleSVG(element);
    case 'money': return generateMoneySVG(element);
    case 'equation': return generateEquationSVG(element);
    case 'square': return generateSquareSVG(element);
    case 'circle': return generateCircleSVG(element);
    case 'fractionBar': return generateFractionBarSVG(element);
    case 'formula': return generateFormulaSVG(element);
    default: return `<svg><text>Unknown element type: ${element.type}</text></svg>`;
  }
}

// Main generation function
function generateAllMathConceptsSVGs() {
  const outputDir = './math-concepts-svgs';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let totalFiles = 0;
  
  Object.entries(MATH_CONCEPTS_QUESTIONS).forEach(([categoryKey, category]) => {
    category.questions.forEach(question => {
      question.visualElements?.forEach((element, elementIndex) => {
        const description = generateElementDescription(element);
        const filename = `q_${String(question.id).padStart(2, '0')}_${element.type}_${elementIndex + 1}_${description}.svg`;
        const svg = generateSVGForElement(element);
        
        fs.writeFileSync(path.join(outputDir, filename), svg);
        console.log(`Generated: ${filename}`);
        totalFiles++;
      });
    });
  });
  
  console.log(`\nGenerated ${totalFiles} SVG files for math concepts questions`);
  
  // Generate README
  generateMathConceptsREADME(totalFiles);
}

function generateMathConceptsREADME(totalFiles) {
  const questionCount = Object.values(MATH_CONCEPTS_QUESTIONS).reduce((sum, cat) => sum + cat.questions.length, 0);
  
  const readmeContent = `# Math Concepts Test - SVG Visual Collection

This directory contains **${totalFiles} SVG files** for visual elements used in math concepts assessment questions.

## 📁 Directory Structure

All SVG files are organized with clear, descriptive naming:

### File Naming Convention

\`\`\`
q_{question_number}_{element_type}_{index}_{description}.svg
\`\`\`

**Components:**
- \`q_01\` - Question number (zero-padded)
- \`thermometer\` - Visual element type
- \`1\` - Element index for questions with multiple visuals
- \`{description}\` - Specific properties (dimensions, values, etc.)

### Examples

- \`q_01_thermometer_1_thermometer_60to80F.svg\` - Question 1, thermometer showing 60°F to 80°F
- \`q_02_rectangle_1_rectangle_15x8.svg\` - Question 2, rectangle with 15×8 dimensions
- \`q_03_money_1_money_45_spent36.svg\` - Question 3, money visualization ($45 start, $36 spent)
- \`q_04_square_1_square_side6cm.svg\` - Question 4, square with 6cm sides

## 🎯 Question Coverage

**Categories Included:**
- **Basic Arithmetic** (Questions 1-3): Rate of change, area calculation, money problems
- **Geometry** (Questions 4-5): Perimeter, area of shapes
- **Fractions** (Question 6): Fraction addition with visual bars

**Age Groups:** Ages 6-11

## 🎨 Visual Element Types

**Supported Elements:**
- **Thermometer**: Temperature displays with scales and time labels
- **Rectangle**: Geometric shapes with dimensions and grid overlays
- **Money**: Currency representations with spending calculations
- **Equation**: Mathematical expressions in formatted boxes
- **Square**: Geometric shapes with perimeter calculations
- **Circle**: Geometric shapes with area formulas
- **Fraction Bar**: Visual fraction representations with segments
- **Formula**: Mathematical formulas in highlighted boxes

## 🔧 Technical Specifications

**SVG Properties:**
- **Variable sizes**: Optimized for content (120×300px to 400×200px)
- **Format**: Clean, scalable SVG with embedded styling
- **Colors**: Educational color palette (blues, greens, oranges)
- **Typography**: Arial font family with proper sizing
- **Interactivity**: Static display optimized for assessment

## 📊 File Statistics

- **Total files**: ${totalFiles} SVG images
- **Questions covered**: ${questionCount} questions
- **Categories**: 3 (arithmetic, geometry, fractions)
- **Visual elements**: Thermometers, shapes, money, equations, formulas

## 🚀 Usage

These SVG files can be used for:
- **Educational materials** - Math concept visualization
- **Assessment tools** - Standardized testing interfaces
- **Research** - Mathematical reasoning studies
- **Training materials** - Teacher resources
- **Digital platforms** - Online math assessment systems

## ⚡ Generation

SVG files were automatically generated from question data using Node.js script that:
1. Parses all math concept questions and visual elements
2. Generates appropriate SVG visualizations for each element type
3. Creates descriptive filenames based on question and element properties
4. Exports complete visual aids including dimensions, labels, and calculations

---

*Generated from Math Concepts Assessment Questions*
*Total: ${totalFiles} SVG files across ${questionCount} questions for ages 6-11*
`;

  fs.writeFileSync('./math-concepts-svgs/README.md', readmeContent);
  console.log('\nGenerated README.md documentation');
}

// Run the generation
if (require.main === module) {
  generateAllMathConceptsSVGs();
}

module.exports = {
  MATH_CONCEPTS_QUESTIONS,
  generateAllMathConceptsSVGs
};