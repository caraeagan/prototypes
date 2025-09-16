# Pattern Reasoning Test - SVG Image Collection

This directory contains **241 SVG files** for all pattern reasoning questions used in the Marker Method assessment platform.

## 📁 Directory Structure

All SVG files are organized with clear, descriptive naming:

### File Naming Convention

```
q_{question_number}_{type}_{index}_{description}.svg
```

**Components:**
- `q_01` - Question number (zero-padded)
- `sequence` - Pattern sequence items (what the student sees)
- `option` - Answer choices (A, B, C, D options numbered 1-4)  
- `question_mark` - Empty tile with question mark
- `{description}` - Shape properties (color_shape_size_rotation_etc)

### Examples

- `q_01_sequence_1_red_circle.svg` - Question 1, first sequence item, red circle
- `q_01_option_4_red_circle.svg` - Question 1, option D, red circle (correct answer)
- `q_35_sequence_2_medium_blue_red_diamond_rot90.svg` - Question 35, sequence item 2, medium split-colored diamond rotated 90°
- `q_36_option_4_medium_green_triangle_rot180.svg` - Question 36, option D, medium green triangle rotated 180°

## 🎯 Question Coverage

**Age Groups Included:**
- **Ages 2.5-3.5** (Questions 1-7): Simple repetition patterns
- **Ages 3.5-4** (Questions 8-10): AB patterns and size variations  
- **Ages 4.5-5** (Questions 11-14): ABC patterns and counting sequences
- **Ages 6-7** (Questions 15-19): Complex patterns and matrix reasoning
- **Ages 8-9** (Questions 20-28): Advanced sequences and transformations
- **Ages 10-11** (Questions 35-36): Complex rotation and reflection patterns

## 🎨 Visual Features

**Shape Types:**
- Circle, Square, Triangle, Diamond, Star, Heart, Hexagon
- Dots (multiple dot arrangements)
- Stars (multiple star arrangements) 

**Properties Supported:**
- **Colors**: 30+ colors (red, blue, yellow, green, purple, etc.)
- **Sizes**: tiny, small, medium, big, bigger
- **Rotations**: 0°, 45°, 90°, 135°, 180°, 270°
- **Modifiers**: dots, stripes, outline styles
- **Positions**: left, center, right, top, bottom
- **Reflections**: horizontal flipping
- **Split colors**: Two-toned shapes (e.g., blue-red diamond)
- **Counting**: Multiple instances of same shape

## 🔧 Technical Specifications

**SVG Properties:**
- **Tile sizes**: 96x96px (large) or 80x80px (small)
- **Format**: Clean, scalable SVG with embedded styling
- **Borders**: Rounded corners with proper borders
- **Question marks**: Dashed borders with blue backgrounds
- **Colors**: Full color palette with proper stroke outlines

## 📊 File Statistics

- **Total files**: 241 SVG images
- **Questions covered**: 28 questions (all pattern reasoning questions)
- **Sequence items**: Variable (2-7 items per question)
- **Options per question**: 4 answer choices each
- **Question marks**: 1 per question

## 🚀 Usage

These SVG files can be used for:
- **Educational materials** - Pattern recognition exercises
- **Assessment tools** - Standardized testing interfaces  
- **Research** - Cognitive development studies
- **Training materials** - Teacher resources
- **Digital platforms** - Online assessment systems

## ⚡ Generation

SVG files were automatically generated from the React component using Node.js extraction script that:
1. Parses all question data from the pattern reasoning component
2. Generates individual SVG tiles for each shape with proper styling
3. Creates descriptive filenames based on shape properties
4. Exports complete tile graphics including borders and backgrounds

---

*Generated from Marker Method Pattern Reasoning Test Component*
*Total: 241 SVG files across 28 questions spanning ages 2.5-11*