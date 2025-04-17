import React, { useState, useCallback, useMemo } from 'react';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { ContractTextPreview } from './ContractTextPreview';

import { Descendant } from 'slate';

interface ContractEditorProps {
  initialValue?: Descendant[];
  risks: any; // Replace 'any' with a more specific type if known
}

export const ContractEditor: React.FC<ContractEditorProps> = ({ initialValue, risks }) => {
  const [value, setValue] = useState<Descendant[]>(initialValue || [{ children: [{ text: '' }] }]);
  const editor = useMemo(() => withReact(createEditor()), []);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'
  
  // Convert Slate value to plain text for preview
  const plainText = useMemo(() => {
    return value.map(n => 
      'children' in n ? n.children.map(c => ('text' in c ? c.text : '')).join('') : ''
    ).join('\n');
  }, [value]);
  
const renderElement = useCallback((props: { attributes: any; children: React.ReactNode }) => <DefaultElement {...props} />, []);
const renderLeaf = useCallback((props: { attributes: any; children: React.ReactNode }) => <DefaultLeaf {...props} />, []);

  return (
    <div className="contract-editor">
      <div className="toolbar">
        <button onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
          {viewMode === 'edit' ? 'Preview' : 'Edit'}
        </button>
        {/* Add more toolbar buttons for formatting */}
      </div>
      
      {viewMode === 'edit' ? (
        <Slate editor={editor} initialValue={value} onChange={newValue => setValue(newValue)}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Write your contract here..."
            spellCheck
            autoFocus
            className="editor-content"
          />
        </Slate>
      ) : (
        <ContractTextPreview 
          contractText={plainText}
          risks={risks}
        />
      )}
    </div>
  );
};

interface DefaultElementProps {
    attributes: any; // Replace 'any' with a more specific type if known
    children: React.ReactNode;
}

const DefaultElement: React.FC<DefaultElementProps> = props => <p {...props.attributes}>{props.children}</p>;
interface DefaultLeafProps {
    attributes: any; // Replace 'any' with a more specific type if known
    children: React.ReactNode;
}

const DefaultLeaf: React.FC<DefaultLeafProps> = props => <span {...props.attributes}>{props.children}</span>;