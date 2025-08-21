let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDraggingCanvas = false;
let lastX, lastY;

let isConnectorMode = false;
let connectionStartNode = null;
let connectionStartPoint = null;
let tempLine = null;
let connectionPoints = [];


document.addEventListener('click', (e) => {
  // Close details panel if clicking outside
  if (!e.target.closest('#details-panel') && !e.target.classList.contains('node-details-btn')) {
    document.getElementById('details-panel').classList.remove('open');
  }
  
  // Deactivate nodes if clicking outside
  if (!e.target.closest('.node') && !e.target.closest('.node-template') && 
      !e.target.closest('#details-panel') && !e.target.closest('#nodes-panel')) {
    document.querySelectorAll('.node, .node-template').forEach(n => n.classList.remove('active'));
  }
document.addEventListener('DOMContentLoaded', () => {
  const closeDetailsBtn = document.getElementById('close-details');
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', (e) => {
      document.getElementById('details-panel').classList.remove('open');
      e.stopPropagation();
    });
  }

  const toggleNodesPanelBtn = document.getElementById('toggle-nodes-panel');
  if (toggleNodesPanelBtn) {
    toggleNodesPanelBtn.addEventListener('click', (e) => {
      const panel = document.getElementById('nodes-panel');
      panel.classList.toggle('collapsed');
      e.stopPropagation();
    });
  }

  const createCustomNodeBtn = document.getElementById('create-custom-node');
  if (createCustomNodeBtn) {
    createCustomNodeBtn.addEventListener('click', (e) => {
      createCustomNode();
      e.stopPropagation();
    });
  }
  
  document.addEventListener('click', (e) => {
    handleDetailsClick(e);
    
    if (!e.target.closest('#details-panel') && !e.target.classList.contains('node-details-btn')) {
      document.getElementById('details-panel').classList.remove('open');
    }
    
    if (!e.target.closest('.node') && !e.target.closest('#details-panel') && !e.target.closest('#nodes-panel')) {
      document.querySelectorAll('.node, .node-template').forEach(n => n.classList.remove('active'));
    }
  });
});

function setupConnectionPoints(node) {
  const positions = [
    { x: 0, y: 0.5, side: 'left' },
    { x: 1, y: 0.5, side: 'right' },
    { x: 0.5, y: 0, side: 'top' },
    { x: 0.5, y: 1, side: 'bottom' }
  ];

  positions.forEach(pos => {
    const point = document.createElement('div');
    point.className = 'node-connection-point';
    point.dataset.side = pos.side;
    point.style.left = `${pos.x * 100}%`;
    point.style.top = `${pos.y * 100}%`;
    point.style.transform = 'translate(-50%, -50%)';
    node.appendChild(point);
  });
}

// Add this function to create a connection line
function createConnection(fromNode, fromSide, toNode, toSide) {
  const canvas = document.getElementById('canvas');
  const line = document.createElement('div');
  line.className = 'connection-line';
  
  const arrow = document.createElement('div');
  arrow.className = 'connection-arrow';
  
  canvas.appendChild(line);
  canvas.appendChild(arrow);
  
  // Store connection data
  line.dataset.fromNode = fromNode.dataset.nodeId || fromNode.dataset.node;
  line.dataset.fromSide = fromSide;
  line.dataset.toNode = toNode.dataset.nodeId || toNode.dataset.node;
  line.dataset.toSide = toSide;
  
  updateConnection(line, arrow, fromNode, fromSide, toNode, toSide);
  return { line, arrow };
}

// Add this function to update connection positions
function updateConnection(line, arrow, fromNode, fromSide, toNode, toSide) {
  const canvas = document.getElementById('canvas');
  
  // Get absolute positions of nodes
  const fromRect = fromNode.getBoundingClientRect();
  const toRect = toNode.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Calculate connection points in absolute coordinates
  const getConnectionPoint = (rect, side) => {
    switch(side) {
      case 'top': return { x: rect.left + rect.width/2, y: rect.top };
      case 'right': return { x: rect.right, y: rect.top + rect.height/2 };
      case 'bottom': return { x: rect.left + rect.width/2, y: rect.bottom };
      case 'left': return { x: rect.left, y: rect.top + rect.height/2 };
    }
  };

  const fromAbs = getConnectionPoint(fromRect, fromSide);
  const toAbs = getConnectionPoint(toRect, toSide);

  // Convert to canvas coordinates (accounting for offset and scale)
  const from = {
    x: (fromAbs.x - canvasRect.left - offsetX) / scale,
    y: (fromAbs.y - canvasRect.top - offsetY) / scale
  };
  
  const to = {
    x: (toAbs.x - canvasRect.left - offsetX) / scale,
    y: (toAbs.y - canvasRect.top - offsetY) / scale
  };

  // Create orthogonal path (L-shaped)
  const midX = from.x + (to.x - from.x)/2;
  const midY = from.y + (to.y - from.y)/2;

  // Create SVG path if needed
  if (!line.tagName === 'path') {
    const oldLine = line;
    const svg = canvas.querySelector('svg') || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (!canvas.querySelector('svg')) canvas.appendChild(svg);
    
    line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.className = 'connection-line';
    line.setAttribute('stroke', '#e6a441');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('fill', 'none');
    oldLine.replaceWith(line);
  }

  // Update path
  line.setAttribute('d', `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`);

  // Position arrow
  arrow.style.left = `${to.x}px`;
  arrow.style.top = `${to.y}px`;
  const angle = Math.atan2(to.y - midY, to.x - midX) * 180 / Math.PI;
  arrow.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
}

// Add this function to handle connection point clicks
function handleConnectionPointClick(e, node, side) {
  e.stopPropagation();
  
  if (!connectionStartNode) {
    // First click - start connection
    connectionStartNode = node;
    connectionStartPoint = side;
    
    // Create temporary line (as SVG)
    const canvas = document.getElementById('canvas');
    const svg = canvas.querySelector('svg') || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (!canvas.querySelector('svg')) {
      canvas.appendChild(svg);
    }
    
    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempLine.className = 'connection-line';
    tempLine.setAttribute('stroke', '#e6a44180');
    tempLine.setAttribute('stroke-width', '2');
    tempLine.setAttribute('fill', 'none');
    svg.appendChild(tempLine);
    
    document.addEventListener('mousemove', updateTempLine);
  } else {
    // Second click - complete connection
    document.removeEventListener('mousemove', updateTempLine);
    
    if (connectionStartNode !== node) {
      // Create permanent connection
      createConnection(connectionStartNode, connectionStartPoint, node, side);
    }
    
    // Clean up
    if (tempLine) tempLine.remove();
    tempLine = null;
    connectionStartNode = null;
    connectionStartPoint = null;
  }
}

// Add this function to update the temporary line during drag
function updateTempLine(e) {
  if (!tempLine || !connectionStartNode) return;
  
  const canvas = document.getElementById('canvas');
  const canvasRect = canvas.getBoundingClientRect();
  const nodeRect = connectionStartNode.getBoundingClientRect();

  // Get absolute start position
  const getConnectionPoint = (rect, side) => {
    switch(side) {
      case 'top': return { x: rect.left + rect.width/2, y: rect.top };
      case 'right': return { x: rect.right, y: rect.top + rect.height/2 };
      case 'bottom': return { x: rect.left + rect.width/2, y: rect.bottom };
      case 'left': return { x: rect.left, y: rect.top + rect.height/2 };
    }
  };

  const fromAbs = getConnectionPoint(nodeRect, connectionStartPoint);
  const toAbs = { x: e.clientX, y: e.clientY };

  // Convert to canvas coordinates
  const from = {
    x: (fromAbs.x - canvasRect.left - offsetX) / scale,
    y: (fromAbs.y - canvasRect.top - offsetY) / scale
  };
  
  const to = {
    x: (toAbs.x - canvasRect.left - offsetX) / scale,
    y: (toAbs.y - canvasRect.top - offsetY) / scale
  };

  // Create orthogonal path
  const midX = from.x + (to.x - from.x)/2;
  const midY = from.y + (to.y - from.y)/2;

  tempLine.setAttribute('d', 
    `M ${from.x} ${from.y} 
     L ${from.x} ${midY} 
     L ${to.x} ${midY} 
     L ${to.x} ${to.y}`);
}

// Add this to the DOMContentLoaded event listener
  if (!isConnectorMode) {
    if (tempLine) tempLine.remove();
    tempLine = null;
    connectionStartNode = null;
    connectionStartPoint = null;
    document.removeEventListener('mousemove', updateTempLine);
  }
});


// Initialize nodes from panel
function initializeNodes() {
  const canvas = document.getElementById('canvas');
  const nodeTemplates = document.querySelectorAll('.node-template');
  console.log('Found node templates:', nodeTemplates.length);
  const centerX = 1000; // Center of the 2000px canvas
  const centerY = 1000; // Center of the 2000px canvas
  const radius = 400; // Radius of the circle
  const angleStep = (2 * Math.PI) / nodeTemplates.length; // Equal angle between nodes

  nodeTemplates.forEach((template, index) => {
    template.addEventListener('mousedown', startDragFromPanel);
    if (template.dataset.node === 'theme') {
      setupThemeToggle(template);
    }
  });

  // Create nodes in a circle pattern
  nodeTemplates.forEach((template, index) => {
    const angle = angleStep * index;
    const x = centerX + radius * Math.cos(angle) - 120;
    const y = centerY + radius * Math.sin(angle) - 60;
    const newNode = template.cloneNode(true);
    newNode.classList.remove('node-template');
    newNode.classList.add('node');
    newNode.style.left = `${x}px`;
    newNode.style.top = `${y}px`;
    canvas.appendChild(newNode);
    setupNode(newNode);
    console.log('Created node:', newNode, 'at', x, y);
  });
  centerView();
}

function setupCanvasControls() {
  const canvasContainer = document.getElementById('canvas-container');
  const canvas = document.getElementById('canvas');
  // Enable zooming with mouse wheel on canvas only when not dragging
  canvas.addEventListener('wheel', (e) => {
    if (isDraggingCanvas) return; // Don't zoom while panning
    e.preventDefault();
    const zoomFactor = 1.2;
    if (e.deltaY < 0) {
      zoom(scale * zoomFactor);
    } else {
      zoom(scale / zoomFactor);
    }
  });
  
  canvasContainer.addEventListener('mousedown', (e) => {
      if (e.target === canvasContainer || e.target === canvas) {
          isDraggingCanvas = true;
          lastX = e.clientX;
          lastY = e.clientY;
          canvasContainer.style.cursor = 'grabbing';
          e.preventDefault();
      }
  });
  
  document.addEventListener('mousemove', (e) => {
      if (isDraggingCanvas) {
          // Linear panning - no scale adjustment needed here
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          
          offsetX += dx;
          offsetY += dy;
          
          updateCanvasTransform();
      }
  });
  
  document.addEventListener('mouseup', () => {
      isDraggingCanvas = false;
      canvasContainer.style.cursor = '';
      updateAllConnections();
  });
  
  // Zoom button event listeners removed
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Zoom button event listeners removed

function updateCanvasTransform() {
  const canvas = document.getElementById('canvas');
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// Add this new zoom function
function zoom(targetScale, duration = 300) {
  const canvas = document.getElementById('canvas');
  const startScale = scale;
  const startOffsetX = offsetX;
  const startOffsetY = offsetY;
  
  // Calculate target offsets to zoom toward viewport center
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  
  // Convert viewport center to canvas coordinates
  const canvasX = (viewportCenterX - offsetX) / scale;
  const canvasY = (viewportCenterY - offsetY) / scale;
  
  // Calculate target offsets to maintain the same canvas point under mouse
  const targetOffsetX = viewportCenterX - canvasX * targetScale;
  const targetOffsetY = viewportCenterY - canvasY * targetScale;
  
  const startTime = performance.now();
  
  function animateZoom(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easing = easeInOutQuad(progress);
      
      scale = startScale + (targetScale - startScale) * easing;
      offsetX = startOffsetX + (targetOffsetX - startOffsetX) * easing;
      offsetY = startOffsetY + (targetOffsetY - startOffsetY) * easing;
      
      updateCanvasTransform();
      updateAllConnections();
      
      if (progress < 1) {
          requestAnimationFrame(animateZoom);
      }
  }
  
  requestAnimationFrame(animateZoom);
}

function updateCanvasTransform() {
  const canvas = document.getElementById('canvas');
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function centerView(duration = 300) {
  const canvasContainer = document.getElementById('canvas-container');
  const containerWidth = canvasContainer.clientWidth;
  const containerHeight = canvasContainer.clientHeight;
  
  const startScale = scale;
  const startOffsetX = offsetX;
  const startOffsetY = offsetY;
  
  const endScale = 1;
  const endOffsetX = (containerWidth / 2) - 1000; // Center of 2000px canvas
  const endOffsetY = (containerHeight / 2) - 1000;
  
  const startTime = performance.now();
  
  function animateCenter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easing = easeInOutQuad(progress);
      
      scale = startScale + (endScale - startScale) * easing;
      offsetX = startOffsetX + (endOffsetX - startOffsetX) * easing;
      offsetY = startOffsetY + (endOffsetY - startOffsetY) * easing;
      
      updateCanvasTransform();
      updateAllConnections();
      
      if (progress < 1) {
          requestAnimationFrame(animateCenter);
      }
  }
  
  requestAnimationFrame(animateCenter);
}

function updateAllConnections() {
  document.querySelectorAll('.connection-line').forEach(line => {
    const fromNode = document.querySelector(`[data-node="${line.dataset.fromNode}"], [data-node-id="${line.dataset.fromNode}"]`);
    const toNode = document.querySelector(`[data-node="${line.dataset.toNode}"], [data-node-id="${line.dataset.toNode}"]`);
    const arrow = line.nextElementSibling; // Assuming arrow is next sibling
    
    if (fromNode && toNode) {
      updateConnection(line, arrow, fromNode, line.dataset.fromSide, toNode, line.dataset.toSide);
    }
  });
}

// Set up node functionality
function setupNode(node) {
  let isDragging = false;
  let offsetX, offsetY;

  if (node.dataset.node === 'theme') {
    setupThemeToggle(node);
  }
  // Removed connector point setup and connector-related event listeners

  // Create action buttons container
  const actionButtons = document.createElement('div');
  actionButtons.className = 'node-actions';
  
  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'node-details-btn';
  detailsBtn.textContent = 'Details';
  actionButtons.appendChild(detailsBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
  actionButtons.appendChild(deleteBtn);
  
  node.appendChild(actionButtons);

  // Add event listeners
  detailsBtn.addEventListener('click', handleDetailsClick);
  deleteBtn.addEventListener('click', (e) => {
    node.remove();

    document.querySelectorAll('.connection-line').forEach(line => {
      if (line.dataset.fromNode === (node.dataset.nodeId || node.dataset.node) || 
          line.dataset.toNode === (node.dataset.nodeId || node.dataset.node)) {
        line.remove();
        if (line.nextElementSibling.classList.contains('connection-arrow')) {
          line.nextElementSibling.remove();
        }
      }
    });

    e.stopPropagation();
  });

  node.addEventListener('click', (e) => {
    if (isDragging) return;
    document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
    node.classList.add('active');
    e.stopPropagation();
  });

  node.addEventListener('mousedown', (e) => {
  if (e.target.closest('.node-actions')) return;

  isDragging = true;
  const canvas = document.getElementById('canvas');
  const canvasRect = canvas.getBoundingClientRect();
  let scale = window.scale || 1;
  // Store offset in canvas coordinates
  node._dragOffsetX = (e.clientX - canvasRect.left) / scale - parseFloat(node.style.left || 0);
  node._dragOffsetY = (e.clientY - canvasRect.top) / scale - parseFloat(node.style.top || 0);
  node.style.cursor = 'grabbing';
  e.stopPropagation();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const canvas = document.getElementById('canvas');
      const canvasRect = canvas.getBoundingClientRect();
      // Use the global scale variable
      let scale = window.scale || 1;
      // Calculate new position accounting for zoom
  let x = (e.clientX - canvasRect.left) / scale - node._dragOffsetX;
  let y = (e.clientY - canvasRect.top) / scale - node._dragOffsetY;
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;

      // Expand canvas if needed
      let nodeRect = node.getBoundingClientRect();
      let edgeThreshold = 200;
      if (nodeRect.right > canvasRect.right - edgeThreshold) {
        const expandAmount = 200;
        canvas.style.width = `${parseInt(canvas.style.width || '2000') + expandAmount}px`;
      }
      if (nodeRect.bottom > canvasRect.bottom - edgeThreshold) {
        const expandAmount = 200;
        canvas.style.height = `${parseInt(canvas.style.height || '2000') + expandAmount}px`;
      }
      
      // Check left edge
      if (nodeRect.left < canvasRect.left + edgeThreshold) {
        const expandAmount = 200;
        canvas.style.width = `${parseInt(canvas.style.width || '2000') + expandAmount}px`;
        offsetX -= expandAmount;
        updateCanvasTransform();
      }
      
      // Check top edge
      if (nodeRect.top < canvasRect.top + edgeThreshold) {
        const expandAmount = 200;
        canvas.style.height = `${parseInt(canvas.style.height || '2000') + expandAmount}px`;
        offsetY -= expandAmount;
        updateCanvasTransform();
      }
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    node.style.cursor = 'grab';
    updateAllConnections();
  });
}

function setupThemeToggle(node) {
  const toggle = node.querySelector('.theme-toggle');
  if (!toggle) return;

  toggle.checked = document.body.classList.contains('light');

  toggle.addEventListener('change', (e) => {
    document.body.classList.toggle('light');
    const label = node.querySelector('.toggle-label');
    if (label) {
      label.textContent = e.target.checked ? 'Light Mode' : 'Dark Mode';
    }
    document.querySelectorAll('.theme-toggle').forEach(t => {
      if (t !== toggle) {
        t.checked = e.target.checked;
      }
    });
  });
}

function startDragFromPanel(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.button !== 0) return;

  const template = e.currentTarget;
  const canvas = document.getElementById('canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const newNode = template.cloneNode(true);
  
  newNode.classList.remove('node-template');
  newNode.classList.add('node');
  newNode.style.position = 'absolute';
  
  if (template.dataset.custom) {
    newNode.dataset.nodeId = template.dataset.nodeId;
    newNode.dataset.custom = true;
  }

  // Node dimensions
  const nodeWidth = 240;
  const nodeHeight = 100;

  // Ghost follows mouse during drag
  const offsetX = nodeWidth/2;
  const offsetY = nodeHeight/2;
  newNode.style.left = `${e.clientX - offsetX}px`;
  newNode.style.top = `${e.clientY - offsetY}px`;
  
  document.body.appendChild(newNode);
  newNode.style.pointerEvents = 'none';
  newNode.style.transform = `scale(${1/scale})`;
  newNode.style.zIndex = '1000';
  newNode.style.opacity = '0.8';

  function moveHandler(e) {
  // Debug logging
  console.log('Mouse:', e.clientX, e.clientY);
  console.log('Canvas rect:', canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height);
  console.log('Raw canvasX:', (e.clientX - canvasRect.left - offsetX) / scale);
  console.log('Raw canvasY:', (e.clientY - canvasRect.top - offsetY) / scale);
  console.log('Clamped canvasX:', Math.max(0, Math.min((e.clientX - canvasRect.left - offsetX) / scale, Math.max(0, (canvasRect.width - nodeWidth) / scale))));
  console.log('Clamped canvasY:', Math.max(0, Math.min((e.clientY - canvasRect.top - offsetY) / scale, Math.max(0, (canvasRect.height - nodeHeight) / scale))));
  // Convert mouse position to canvas coordinates
  const canvasRect = canvas.getBoundingClientRect();
  let canvasX = (e.clientX - canvasRect.left - offsetX) / scale;
  let canvasY = (e.clientY - canvasRect.top - offsetY) / scale;

  // Clamp position so node stays within canvas and never goes negative
  const minX = 0;
  const minY = 0;
  const maxX = Math.max(0, (canvasRect.width - nodeWidth) / scale);
  const maxY = Math.max(0, (canvasRect.height - nodeHeight) / scale);
  canvasX = Math.max(minX, Math.min(canvasX, maxX));
  canvasY = Math.max(minY, Math.min(canvasY, maxY));

  newNode.style.left = `${Math.max(0, canvasX)}px`;
  newNode.style.top = `${Math.max(0, canvasY)}px`;
  }

  function upHandler(e) {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    
    if (e.clientX > 250) {
      const canvasRect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - canvasRect.left - offsetX) / scale;
      const canvasY = (e.clientY - canvasRect.top - offsetY) / scale;
      
      newNode.style.left = `${canvasX - nodeWidth/2}px`;
      newNode.style.top = `${canvasY - nodeHeight/2}px`;
      newNode.style.transform = '';
      newNode.style.opacity = '';
      newNode.style.pointerEvents = 'auto';
      newNode.style.zIndex = '';
      
      canvas.appendChild(newNode);
      setupNode(newNode);
    } else {
      newNode.remove();
    }
  }

  function moveHandler(e) {
    // Debug logging for drag
    console.log('Raw moveHandler:', 'clientX:', e.clientX, 'clientY:', e.clientY, 'offsetX:', offsetX, 'offsetY:', offsetY);
    newNode.style.left = `${e.clientX - offsetX}px`;
    newNode.style.top = `${e.clientY - offsetY}px`;
  }

  function upHandler(e) {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    
    if (e.clientX > 250) { // In canvas area
      // Calculate drop position relative to canvas center
      const canvasRect = canvas.getBoundingClientRect();
      const canvasCenterX = canvasRect.width/2;
      const canvasCenterY = canvasRect.height/2;
      
      // Mouse position relative to canvas center
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      
      // Calculate position from center (scaled)
      const fromCenterX = (mouseX - canvasCenterX) / scale;
      const fromCenterY = (mouseY - canvasCenterY) / scale;
      
      // Final position (canvas center + offset)
      const centerX = 1000; // Canvas center X (2000px width / 2)
      const centerY = 1000; // Canvas center Y (2000px height / 2)
      const finalX = centerX + fromCenterX - nodeWidth/2;
      const finalY = centerY + fromCenterY - nodeHeight/2;
      
      newNode.style.left = `${finalX}px`;
      newNode.style.top = `${finalY}px`;
      newNode.style.transform = '';
      newNode.style.opacity = '';
      newNode.style.pointerEvents = 'auto';
      newNode.style.zIndex = '';
      
      canvas.appendChild(newNode);
      setupNode(newNode);
    } else {
      newNode.remove();
    }
  }

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
  
  e.preventDefault();
  e.stopPropagation();
}

function createCustomNode() {
  const nodeId = 'custom-' + Date.now();
  
  const nodesPanel = document.querySelector('.nodes-container');
  const newNodeTemplate = document.createElement('div');
  newNodeTemplate.className = 'node-template custom-node editable';
  newNodeTemplate.dataset.node = 'custom';
  newNodeTemplate.dataset.nodeId = nodeId;
  newNodeTemplate.innerHTML = `
    <div class="node-header">
      <div class="header-content">
        <img src="aws_lambda.svg" alt="icon" />
        <textarea class="node-title-edit" placeholder="Node Title" rows="1">New Node</textarea>
      </div>
    </div>
    <div class="node-body">
      <textarea class="node-content-edit" placeholder="Enter node content here..."></textarea>
    </div>
    <div class="node-edit-actions">
      <button class="save-node-btn">Save</button>
      <button class="cancel-node-btn">Cancel</button>
    </div>
    <div class="node-actions">
      <button class="delete-btn">Delete</button>
    </div>
  `;
  
  nodesPanel.appendChild(newNodeTemplate);
  
  // Auto-resize the title textarea
  (newNodeTemplate.querySelector('.node-title-edit')).focus();
  (newNodeTemplate.querySelector('.node-title-edit')).select();
  
  // Add auto-resize functionality
  (newNodeTemplate.querySelector('.node-title-edit')).addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });
  
  // Trigger initial resize
  (newNodeTemplate.querySelector('.node-title-edit')).dispatchEvent(new Event('input'));
  
  // Focus on the title input
  const titleInput = newNodeTemplate.querySelector('.node-title-edit');
  (newNodeTemplate.querySelector('.node-title-edit')).focus();
  
  // Set up event listeners
  newNodeTemplate.querySelector('.save-node-btn').addEventListener('click', () => saveCustomNode(newNodeTemplate));
  newNodeTemplate.querySelector('.cancel-node-btn').addEventListener('click', () => cancelCustomNode(newNodeTemplate));
  
  // Add click handler for the node template
  newNodeTemplate.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
        e.target.classList.contains('save-node-btn') || e.target.classList.contains('cancel-node-btn')) {
      return;
    }
    
    document.querySelectorAll('.node-template').forEach(n => n.classList.remove('active'));
    newNodeTemplate.classList.add('active');
    e.stopPropagation();
  });
  
  // Add drag functionality (modified to ignore inputs)
  newNodeTemplate.addEventListener('mousedown', startDragFromPanel);
}

function saveCustomNode(template) {
  const title = template.querySelector('.node-title-edit').value || 'Untitled';
  const content = template.querySelector('.node-content-edit').value || 'No content';
  
  // Convert to regular node template
  template.classList.remove('editable');
  template.innerHTML = `
    <div class="node-header">
      <div class="header-content">
        <img src="aws_lambda.svg" alt="icon" />
        <div class="node-title">${title.replace(/\n/g, '<br>')}</div>
      </div>
    </div>
    <div class="node-body">
      ${content.replace(/\n/g, '<br>')}
    </div>
    <div class="node-actions">
      <button class="delete-btn">Delete</button>
    </div>
  `;
  
  // Store details for the details panel
  template.dataset.customDetails = `Custom Node: ${title}\n\n---\n${content}`;
  
  // Re-add event listeners
  template.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      // Remove from panel
      template.remove();
      
      // Remove from canvas if it exists
      const nodeId = template.dataset.nodeId;
      const canvasNode = document.querySelector(`.node[data-node-id="${nodeId}"]`);
      if (canvasNode) canvasNode.remove();
      
      e.stopPropagation();
      return;
    }
    
    document.querySelectorAll('.node-template').forEach(n => n.classList.remove('active'));
    template.classList.add('active');
    e.stopPropagation();
  });
  
  // Re-add drag functionality
  template.addEventListener('mousedown', startDragFromPanel);
}

function cancelCustomNode(template) {
  template.remove();
}

function handleDetailsClick(e) {
  // Check if click came from either the button or its container
  if (e.target.classList.contains('node-details-btn') || e.target.closest('.node-details-btn')) {
    const node = e.target.closest('.node');
    const nodeName = node.dataset.node;
    const panel = document.getElementById('details-panel');
    const content = document.getElementById('details-content');
    const panelTitle = document.getElementById('panel-title');

    const details = {
      home: `AWS::Serverless::INFO\n**Contact**\n\n---\n\nCharlotte, NC\nSRE II at ConnectWise\nPhone: (813)727-0464\nEmail: Kthangraham@hotmail.com\nLinkedIn: <a href="https://www.linkedin.com/in/kthangraham" target="_blank">kthangraham</a>\n\n---\n\nCloud infrastructure specialist optimizing AWS environments for 99.99% uptime while reducing costs by 53% through automation and strategic resource management.`,
      
      skills: `AWS::Serverless::SkillSet\n**Skills**\n\n---\n
Cloud & Serverless: Extensive experience with AWS (Lambda, S3, IAM, CloudWatch, Secrets Manager, Route53, DynamoDB, API Gateway, VPC) for automation, monitoring, and scalable infrastructure. Designed and deployed serverless solutions for real-world business needs. Familiar with Azure basics.
Automation & Monitoring: Built automated data pipelines, custom monitoring solutions, and Slack integrations. Used CloudWatch, Lambda, and scripting to reduce manual work and improve reliability.
Programming & Scripting: Python (automation, data scraping, serverless), PowerShell (system utilities), JavaScript (web and desktop tools), SQL/MySQL (data queries and analytics).
DevOps & CI/CD: Experience with GitLab Pipelines, automated deployment workflows, infrastructure as code, and automated testing.
Workflow & Data: Developed tools for metadata extraction, file system mapping, and analytics. Improved business processes and reduced errors through automation.
Process Improvement: Led documentation and playbook creation, streamlined cross-team efficiency, and improved incident response.
Soft Skills: Problem-solving, rapid prototyping, support-to-SRE intuition, cross-functional collaboration.
`,

      experience: `AWS::Serverless::EXP\n**Experience**\n\n---\n\nSite Reliability Engineer II
ConnectWise | [Aug-2023 - current]
•	Cut AWS Costs by 53% – Like a detective, tracked down wasted resources and automated fixes while maintaining > 99.99% uptime for all servers.
•	Led 6,000+ Server Migrations – From Windows 2012 to 2022, ensuring zero downtime for customers
•	Resolved Critical Incidents in <2 Hours – Used my Tier 2 triage skills to fix ScreenConnect/Automate fires faster than most SREs could log in.
•	Redesigned QA Deployments – Simplified testing pipelines for the Manage and Automate products because I've seen what happens when bad releases hit customers.
\n---\n\nTier 1 and 2 Support Engineer 
ConnectWise | [Mar-2021 to Aug-2023]
•	Specialty – Specialized in database management and scripting trouble shooting/repair.
•	Customer - Centric Debugging – Learned how infrastructure failures actually impact users—now I build systems that fail gracefully.
•	Server stability - Ensure the partners servers can perform critical SQL queries. By Maintain Both Front and back end of servers.
•	Trouble shooting – trouble shoot different types of environmental issues to discover the root cause and provide solutions.
`,
      
      projects: `AWS::Serverless::Projects\n**Projects**\n\n---\n
• Local LLM Lab – Developed a scalable platform for experimenting with large language models (LLMs) on AWS. Automated data pipelines, model deployment, and monitoring using Lambda, S3, and CloudWatch. Improved inference speed by 30% and enabled rapid prototyping for NLP use cases.
• Inventory Checker – Built a Python script to scrape and validate over 5,000 inventory records, automating manual checks and reducing errors by 80%.
• Picture Filing System/Mapping – Created a tool to extract metadata from RAW image files and automatically organize them into folders by date, country, and city. Enhanced searchability and workflow for large photo collections.
• Stream Deck Snipping – Engineered a desktop utility to record the last 2 minutes of system audio and instantly replay the last 5 seconds. Used for rapid review and content creation.
• Support-to-SRE Playbook – Led the reorganization of internal documentation and processes, streamlining efficiency between support and SRE teams. Resulted in faster onboarding and reduced incident response times.
• Infrastructure from Scratch – Designed and deployed cloud infrastructure for a property management company to track contract events. Leveraged AWS serverless technologies for cost-effective scalability and reliability.
• Work Related – Implemented/created monitoring, alerting, and automation for AWS and Azure (S3, IAM, Secrets, CloudTrail, Route53, pipelines). Automated deployment pipelines and migrations. Developed company-wide SQL queries combining multiple databases to improve troubleshooting, migrations, and licensing audits.
`,

      references: `AWS::Serverless::References\n**Professional References**\n\n---\n
References available upon request from:
• Former managers
• Colleagues
• Professional contacts\n\n---\n
I maintain strong professional relationships and can provide references that speak to my technical skills, problem-solving abilities, and teamwork.
`,
      '3dprinting': `AWS::Serverless::3DPrinting\n**3D Printing Skills**\n\n---\n\n• CAD Modeling: Experienced with Fusion 360 for functional part design\n• Prototyping: Rapid iteration of mechanical components\n• Troubleshooting: Advanced printer calibration and maintenance\n• Materials: Worked with PLA, PETG, TPU, and composite materials\n\n---\n\nPersonal projects include:\n• Custom keyboard components\n• Camera rig accessories\n• Household utility items\n• Mechanical prototypes for IoT devices`,
      theme: `AWS::Serverless::Theme\n**Theme**\n\n---\nToggle between light and dark theme modes, nothing crazy over here`,
      custom: node.dataset.customDetails || "No details available",
      resume: `AWS::Serverless::Resume\n**Download Resume**\n\n---\nClick the button below to download my latest resume\n\n<button id="download-resume-btn" class="download-btn">Download Resume</button>`
    };

    panelTitle.textContent = "Resource properties";
    const nodeDetails = details[nodeName] || "No details available";
    content.innerHTML = formatDetails(nodeDetails);
    
    // Add the download button event listener right here
    const downloadBtn = content.querySelector('#download-resume-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = 'Kthan_Graham_Resume_2025.docx'; // Make sure this matches your actual file name
        a.download = 'resume 2025.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }
    
    panel.classList.add('open');
    e.stopPropagation();
  }
}


function formatDetails(text) {
  const lines = text.split('\n');
  let html = '';
  
  lines.forEach(line => {
    if (line.startsWith('**')) {
      html += `<h4>${line.replace(/\*\*/g, '')}</h4>`;
    } else if (line === '---') {
      html += '<hr class="divider">';
    } else if (line.startsWith('•')) {
      html += `<p class="bullet-point">${line}</p>`;
    } else if (line.trim() === '') {
      html += '<br>';
    } else {
      html += `<p>${line}</p>`;
    }
  });
  
  return html;
}

document.addEventListener('DOMContentLoaded', () => {
  initializeNodes();
  setupCanvasControls();
  
  document.getElementById('close-details').addEventListener('click', (e) => {
    document.getElementById('details-panel').classList.remove('open');
    e.stopPropagation();
  });
  
  document.getElementById('toggle-nodes-panel').addEventListener('click', (e) => {
    const panel = document.getElementById('nodes-panel');
    panel.classList.toggle('collapsed');
    e.stopPropagation();
  });

  document.getElementById('create-custom-node').addEventListener('click', (e) => {
    createCustomNode();
    e.stopPropagation();
  });
  
  document.addEventListener('click', (e) => {
    handleDetailsClick(e);
    
    if (!e.target.closest('#details-panel') && !e.target.classList.contains('node-details-btn')) {
      document.getElementById('details-panel').classList.remove('open');
    }
    
    if (!e.target.closest('.node') && !e.target.closest('#details-panel') && !e.target.closest('#nodes-panel')) {
      document.querySelectorAll('.node, .node-template').forEach(n => n.classList.remove('active'));
    }
  });
});