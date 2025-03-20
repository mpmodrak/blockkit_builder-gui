import React, { useState } from 'react';

const BlockKitBuilder = () => {
  // Define key states
  const [blocks, setBlocks] = useState([]);
  const [jsonOutput, setJsonOutput] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);

  // Block types we support (limiting to 3 as requested)
  const blockTypes = [
    { 
      id: 'section', 
      name: 'Section', 
      icon: '📝',
      description: 'A simple text block that can include optional accessory elements' 
    },
    { 
      id: 'image', 
      name: 'Image', 
      icon: '🖼️',
      description: 'A simple image block with a title and alt text'
    },
    { 
      id: 'divider', 
      name: 'Divider', 
      icon: '➖',
      description: 'A divider line to separate blocks'
    }
  ];

  // Generate a unique ID for new blocks
  const generateId = () => `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Create a new block of the given type
  const createBlock = (type) => {
    const id = generateId();
    
    switch (type) {
      case 'section':
        return {
          id,
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'This is a section block with text.'
          }
        };
      case 'image':
        return {
          id,
          type: 'image',
          title: {
            type: 'plain_text',
            text: 'Image Title'
          },
          image_url: 'https://api.slack.com/img/blocks/bkb_template_images/palmtree.png',
          alt_text: 'A palm tree'
        };
      case 'divider':
        return {
          id,
          type: 'divider'
        };
      default:
        return null;
    }
  };

  // Handle drag start from the component palette
  const handleDragStart = (e, blockType) => {
    e.dataTransfer.setData('blockType', blockType);
    setDraggedItem({ type: 'new', blockType });
  };

  // Handle drag start for existing blocks (for reordering)
  const handleBlockDragStart = (e, index) => {
    e.dataTransfer.setData('blockIndex', index.toString());
    setDraggedItem({ type: 'existing', blockIndex: index });
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDropTargetIndex(index);
  };

  // Handle drop from palette or reordering
  const handleDrop = (e) => {
    e.preventDefault();
    
    // Handle dropping a new block from the palette
    const blockType = e.dataTransfer.getData('blockType');
    if (blockType) {
      const newBlock = createBlock(blockType);
      const updatedBlocks = [...blocks];
      
      if (dropTargetIndex !== null) {
        updatedBlocks.splice(dropTargetIndex, 0, newBlock);
      } else {
        updatedBlocks.push(newBlock);
      }
      
      setBlocks(updatedBlocks);
      setSelectedBlockId(newBlock.id);
    }
    
    // Handle reordering existing blocks
    const blockIndex = e.dataTransfer.getData('blockIndex');
    if (blockIndex && dropTargetIndex !== null) {
      const fromIndex = parseInt(blockIndex);
      const toIndex = dropTargetIndex > fromIndex ? dropTargetIndex - 1 : dropTargetIndex;
      
      if (fromIndex !== toIndex) {
        const updatedBlocks = [...blocks];
        const [movedBlock] = updatedBlocks.splice(fromIndex, 1);
        updatedBlocks.splice(toIndex, 0, movedBlock);
        setBlocks(updatedBlocks);
      }
    }
    
    // Reset states
    setDraggedItem(null);
    setDropTargetIndex(null);
  };

  // Handle dropping on empty canvas
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    
    const blockType = e.dataTransfer.getData('blockType');
    if (blockType) {
      const newBlock = createBlock(blockType);
      setBlocks([...blocks, newBlock]);
      setSelectedBlockId(newBlock.id);
    }
    
    setDraggedItem(null);
    setDropTargetIndex(null);
  };

  // Update properties of a block
  const updateBlockProperties = (id, updatedProps) => {
    const updatedBlocks = blocks.map(block => 
      block.id === id ? { ...block, ...updatedProps } : block
    );
    setBlocks(updatedBlocks);
  };

  // Delete a block
  const deleteBlock = (id) => {
    setBlocks(blocks.filter(block => block.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  // Generate JSON output
  const generateJson = () => {
    // Create a clean version without internal IDs
    const cleanBlocks = blocks.map(({ id, ...block }) => block);
    const json = JSON.stringify(cleanBlocks, null, 2);
    setJsonOutput(json);
  };

  // Copy JSON to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    alert('JSON copied to clipboard!');
  };

  // Properties panel for the selected block
  const PropertiesPanel = () => {
    const selectedBlock = blocks.find(block => block.id === selectedBlockId);
    
    if (!selectedBlock) {
      return (
        <div className="text-gray-500 italic p-4">
          Select a block to edit its properties
        </div>
      );
    }
    
    switch (selectedBlock.type) {
      case 'section':
        return (
          <div className="space-y-4 p-4">
            <h3 className="font-medium">Section Properties</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Text</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={4}
                value={selectedBlock.text?.text || ''}
                onChange={(e) => updateBlockProperties(selectedBlock.id, {
                  text: { ...selectedBlock.text, text: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Text Type</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedBlock.text?.type || 'mrkdwn'}
                onChange={(e) => updateBlockProperties(selectedBlock.id, {
                  text: { ...selectedBlock.text, type: e.target.value }
                })}
              >
                <option value="mrkdwn">Markdown</option>
                <option value="plain_text">Plain Text</option>
              </select>
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-4 p-4">
            <h3 className="font-medium">Image Properties</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={selectedBlock.title?.text || ''}
                onChange={(e) => updateBlockProperties(selectedBlock.id, {
                  title: { type: 'plain_text', text: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={selectedBlock.image_url || ''}
                onChange={(e) => updateBlockProperties(selectedBlock.id, {
                  image_url: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Alt Text</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={selectedBlock.alt_text || ''}
                onChange={(e) => updateBlockProperties(selectedBlock.id, {
                  alt_text: e.target.value
                })}
              />
            </div>
          </div>
        );
      
      case 'divider':
        return (
          <div className="space-y-4 p-4">
            <h3 className="font-medium">Divider Properties</h3>
            <p className="text-gray-500 italic">
              Dividers have no editable properties
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render a preview of a block
  const BlockPreview = ({ block }) => {
    switch (block.type) {
      case 'section':
        return (
          <div className="p-3 border-l-4 border-blue-500">
            <div className="text-sm whitespace-pre-wrap">
              {block.text?.text || 'Empty section'}
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="p-3 border-l-4 border-green-500">
            <div className="font-medium text-sm mb-1">
              {block.title?.text || 'Image'}
            </div>
            <div className="bg-gray-100 h-20 flex items-center justify-center text-sm text-gray-500">
              <span>[Image: {block.alt_text || 'No alt text'}]</span>
            </div>
          </div>
        );
      
      case 'divider':
        return (
          <div className="py-2 border-l-4 border-gray-500">
            <div className="border-t border-gray-300"></div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-purple-700 text-white p-4">
        <h1 className="text-xl font-bold">Slack Block Kit Builder</h1>
      </header>
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Component palette */}
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          <h2 className="font-bold mb-3">Block Types</h2>
          <div className="space-y-2">
            {blockTypes.map(blockType => (
              <div
                key={blockType.id}
                draggable
                onDragStart={(e) => handleDragStart(e, blockType.id)}
                className="p-3 bg-gray-100 rounded border cursor-grab hover:bg-blue-50 transition-colors"
                onClick={() => {
                  const newBlock = createBlock(blockType.id);
                  setBlocks([...blocks, newBlock]);
                  setSelectedBlockId(newBlock.id);
                }}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">{blockType.icon}</span>
                  <span className="font-medium">{blockType.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{blockType.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Canvas and properties split view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas */}
          <div 
            className="flex-1 p-6 overflow-y-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            <div className="bg-white rounded-lg shadow p-6 min-h-full">
              <h2 className="font-bold mb-4">Block Canvas</h2>
              
              {blocks.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center text-gray-400">
                  Drag blocks here or click on a block type to add
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block, index) => (
                    <React.Fragment key={block.id}>
                      {/* Drop indicator */}
                      {dropTargetIndex === index && (
                        <div className="h-1 bg-purple-500 rounded-full"></div>
                      )}
                      
                      {/* Block item */}
                      <div
                        className={`border rounded-md ${selectedBlockId === block.id ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200 hover:border-gray-300'}`}
                        onClick={() => setSelectedBlockId(block.id)}
                        draggable
                        onDragStart={(e) => handleBlockDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={handleDrop}
                      >
                        <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
                          <div className="flex items-center">
                            <span className="text-gray-400 cursor-move mr-2">⋮⋮</span>
                            <span className="font-medium text-sm">{blockTypes.find(t => t.id === block.type)?.name || block.type}</span>
                          </div>
                          <button
                            className="text-red-500 hover:text-red-700 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBlock(block.id);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        
                        <BlockPreview block={block} />
                      </div>
                      
                      {/* Last drop indicator */}
                      {index === blocks.length - 1 && dropTargetIndex === blocks.length && (
                        <div className="h-1 bg-purple-500 rounded-full"></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Properties panel */}
          <div className="w-72 bg-white border-l overflow-y-auto">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-bold">Properties</h2>
            </div>
            
            <PropertiesPanel />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white border-t p-4 flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-500">
            {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
          </span>
        </div>
        
        <div className="flex space-x-3">
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={generateJson}
          >
            Generate JSON
          </button>
          
          <button
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center"
            onClick={copyToClipboard}
            disabled={!jsonOutput}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Copy JSON
          </button>
        </div>
      </div>
      
      {/* JSON output panel (collapsible) */}
      {jsonOutput && (
        <div className="bg-gray-800 text-white p-4 overflow-x-auto">
          <pre className="text-sm">{jsonOutput}</pre>
        </div>
      )}
    </div>
  );
};

export default BlockKitBuilder;