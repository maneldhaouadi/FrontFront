'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { useCallback, useEffect, useState, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { FaTrash, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaListUl, FaListOl, FaLink, FaTable, FaCode, FaSave, FaUndo, FaRedo, FaPalette, FaFont, FaImage, FaUpload } from 'react-icons/fa';
import { BiUndo, BiRedo } from 'react-icons/bi';
import { TemplateFieldsPanel } from './TemplateFielsPanel';
import { ChevronDown } from 'lucide-react';
import { Template, TemplateType, TemplateTypeValues } from '@/types/template';
import { templateApi } from '@/api';
import Image from '@tiptap/extension-image'; 




const lowlight = createLowlight(common);



// Extension Image personnalisée avec redimensionnement
const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        renderHTML: attributes => ({
          width: attributes.width
        })
      },
      height: {
        default: null,
        renderHTML: attributes => ({
          height: attributes.height
        })
      },
      style: {
        default: 'display: inline-block; position: relative;',
        renderHTML: attributes => ({
          style: attributes.style
        })
      }
    }
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      { 
        class: 'resizable-image-container',
        style: HTMLAttributes.style
      },
      ['img', HTMLAttributes],
      ['div', { class: 'resize-handle' }]
    ]
  }
});


interface TiptapEditorProps {
  value: string;
  onChange: (content: string) => void;
  templateId?: number;
  templateData?: Template;
  onSaveComplete?: () => void;
  onLoad?: () => void;
}

export default function TiptapEditor({
  value,
  onChange,
  templateId,
  templateData,
  onSaveComplete,
  onLoad,
}: TiptapEditorProps) {
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTablePopup, setShowTablePopup] = useState(false);

  const [tableSize, setTableSize] = useState({
    rows: 1,
    cols: 1,
  });
  const [documentType, setDocumentType] = useState<TemplateType>(() => {
    if (templateData?.type) {
      const normalizedType = templateData.type.toLowerCase();
      if (Object.values(TemplateType).includes(normalizedType as TemplateType)) {
        return normalizedType as TemplateType;
      }
    }
    
    if (templateId) {
      templateApi.getById(templateId)
        .then(template => {
          if (template?.type) {
            setDocumentType(template.type);
          }
        })
        .catch(console.error);
    }
    
    return TemplateType.QUOTATION;
  });

  // États pour le redimensionnement d'image
  const [resizing, setResizing] = useState(false);
const [startSize, setStartSize] = useState({ 
  width: 0, 
  height: 0, 
  x: 0, 
  y: 0 
});
const [currentImage, setCurrentImage] = useState<HTMLElement | null>(null);
const editorRef = useRef<HTMLDivElement>(null);



  

const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5',
          },
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left'
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-800 my-4',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: '',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-400 p-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-800 bg-gray-100 font-bold p-2',
        },
      }),
      CustomImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'resizable-image-container', // Changé de 'resizable-image'
        },
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleEditorChange(html);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor p-4 min-h-[700px] border rounded bg-white",
      },
    },
  });

  // Gestion du redimensionnement d'image
  useEffect(() => {
    if (!editor) return;


    
  
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('resize-handle')) {
        e.preventDefault();
        const container = target.closest('.resizable-image-container') as HTMLElement;
        if (container) {
          const img = container.querySelector('img');
          if (img) {
            setResizing(true);
            setCurrentImage(container);
            setStartSize({
              width: img.offsetWidth,
              height: img.offsetHeight,
              x: e.clientX,
              y: e.clientY
            });
            document.body.style.cursor = 'nwse-resize';
            document.body.style.userSelect = 'none';
            container.classList.add('resizing');
          }
        }
      }
    };
  
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing || !currentImage) return;
      
      const img = currentImage.querySelector('img');
      if (!img) return;
      
      const deltaX = e.clientX - startSize.x;
      const deltaY = e.clientY - startSize.y;
      
      let newWidth = startSize.width + deltaX;
      let newHeight = startSize.height + deltaY;
      
      // Contraintes de taille
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(50, newHeight);
      
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
    };
  
    const handleMouseUp = () => {
      if (!resizing || !currentImage) return;
      
      const img = currentImage.querySelector('img');
      if (img) {
        editor.commands.updateAttributes('image', {
          width: img.style.width,
          height: img.style.height
        });
      }
      
      currentImage.classList.remove('resizing');
      setResizing(false);
      setCurrentImage(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, startSize, currentImage, editor]);


 const handleImageUpload = useCallback(
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      editor.chain().focus().setImage({ 
        src: imageUrl,
        width: '300px', // Taille initiale
        height: 'auto',
        style: 'display: inline-block; position: relative;'
      }).run();
    };
    reader.readAsDataURL(file);
  },
  [editor]
);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const colorPalette = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#00ffff', '#ff00ff', '#c0c0c0', '#808080',
    '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
  ];

  const applyColor = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setColor(currentColor).run();
    setShowColorPicker(false);
  }, [editor, currentColor]);

  const handleHoverTableSize = (rows: number, cols: number) => {
    setTableSize({
      rows: Math.min(rows, 9),  // Limite à 9 lignes
      cols: Math.min(cols, 9),  // Limite à 9 colonnes
    });
  };

  const handleTableInsert = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ 
        rows: tableSize.rows, 
        cols: tableSize.cols,
        withHeaderRow: true 
      })
      .run();
    setShowTablePopup(false);
  }, [editor, tableSize]);

  const handleEditorChange = useCallback(
    (content: string) => {
      if (content !== value) {
        onChange(content);
      }
    },
    [onChange, value]
  );

  const handleSave = useCallback(() => {
    if (editor) {
      const content = editor.getHTML();
      onChange(content);
      onSaveComplete?.();
    }
  }, [editor, onChange, onSaveComplete]);

  const insertDynamicField = useCallback((fieldPath: string, fieldType: 'invoice' | 'quotation' | 'payment') => {
    if (!editor) return;
    
    if (fieldPath.match(/<%=|{%/)) {
      editor.commands.insertContent(fieldPath);
    } else if (fieldPath.includes('{{')) {
      const convertedField = fieldPath.replace(/\{\{(.+?)\}\}/g, `<%= ${fieldType}.$1 %>`);
      editor.commands.insertContent(convertedField);
    } else {
      editor.commands.insertContent(`<%= ${fieldType}.${fieldPath} %>`);
    }
    
    setShowVariableMenu(false);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkMenu(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const dynamicFields = [
    { label: 'Document Number', field: 'meta.type' },
    { label: 'Client Name', field: 'quotation.firm.name' },
    { label: 'Company Name', field: 'quotation.cabinet.enterpriseName' },
    { label: 'Total Amount', field: 'quotation.total' },
    { label: 'Invoice Date', field: 'quotation.date' },
  ];

  useEffect(() => {
    if (templateData?.type) {
      const normalizedType = templateData.type.toLowerCase();
      if (Object.values(TemplateType).includes(normalizedType as TemplateType)) {
        setDocumentType(normalizedType as TemplateType);
      }
    }
  }, [templateData]);

  if (!editor) {
    return <div className="p-4 text-center">Loading editor...</div>;
  }

  return (
<div className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col" style={{ height: '80vh' }}>
      <style jsx global>{`
        .tiptap-editor {
          padding: 1rem;
          min-height: 700px;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
        }

        .tiptap-editor table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
          table-layout: fixed;
          border: 1px solid #1e293b;
        }

        .tiptap-editor th,
        .tiptap-editor td {
          border: 1px solid #94a3b8;
          padding: 0.5rem;
          min-width: 50px;
          position: relative;
        }

        .tiptap-editor th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: left;
        }

        .tiptap-editor .tableWrapper {
          margin: 1rem 0;
          overflow-x: auto;
        }

        .resizable-image {
          display: inline-block;
          position: relative;
          max-width: 100%;
        }

        .resizable-image img {
          max-width: 100%;
          height: auto;
        }

        .resizable-image .resize-handle {
          position: absolute;
          right: -8px;
          bottom: -8px;
          width: 16px;
          height: 16px;
          background-color: #4299e1;
          border-radius: 50%;
          cursor: nwse-resize;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .resizable-image:hover .resize-handle {
          opacity: 1;
        }

        .resizable-image.resizing {
          user-select: none;
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
        <div className="flex items-center border-r border-gray-200 pr-2 mr-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className={`p-1 rounded ${
              !editor?.can().undo() 
                ? 'opacity-30 cursor-not-allowed text-gray-400' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Annuler (Ctrl+Z)"
          >
            <BiUndo className="w-5 h-5" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className={`p-1 rounded ${
              !editor?.can().redo() 
                ? 'opacity-30 cursor-not-allowed text-gray-400' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Rétablir (Ctrl+Y)"
          >
            <BiRedo className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-2 rounded ${
              editor?.isActive('textStyle', { color: currentColor }) 
                ? 'bg-gray-200' 
                : 'hover:bg-gray-100'
            }`}
            title="Couleur du texte"
          >
            <FaFont />
          </button>

          {showColorPicker && (
            <div className="absolute z-50 left-0 top-full mt-1 p-3 bg-white rounded-md shadow-lg border w-64">
              <div className="grid grid-cols-8 gap-1 mb-3">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setCurrentColor(color);
                      applyColor();
                    }}
                    title={color}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-6 h-6 rounded border border-gray-300" 
                  style={{ backgroundColor: currentColor }}
                />
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="flex-1 p-1 text-sm border rounded"
                  placeholder="#RRGGBB"
                />
              </div>
              
              <button
                onClick={applyColor}
                className="w-full py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowVariableMenu(!showVariableMenu)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border bg-white hover:bg-gray-50"
          >
            <span>Publipostage</span>
            <ChevronDown 
              size={16} 
              className={`transition-transform ${showVariableMenu ? 'rotate-180' : ''}`}
            />
          </button>
          
          {showVariableMenu && (
            <div className="absolute z-50 left-0 mt-1 w-[28rem] bg-white rounded-md shadow-lg border border-gray-200">
              <div className="p-3 border-b bg-gray-50 sticky top-0">
                <h3 className="text-sm font-medium text-gray-700">
                  Champs disponibles - {templateData?.type ? templateData.type.toUpperCase() : 'DOCUMENT'}
                </h3>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
                <TemplateFieldsPanel
                  key={`fields-${documentType}-${Date.now()}`}
                  onInsertField={insertDynamicField}
                  type={documentType as TemplateType}
                  compact={false}
                  templateData={templateData}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-100"
          >
            Affichage
            <span>▼</span>
          </button>
        </div>

        <div className="relative">
          <button 
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-100"
          >
            Paragraphe
            <span>▼</span>
          </button>
        </div>

        <div className="border-l h-6 mx-2"></div>

        <select
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'paragraph') {
              editor.chain().focus().setParagraph().run();
            } else {
              const level = parseInt(value.replace('h', '')) as 1 | 2 | 3;
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
          value={
            editor.isActive('paragraph') 
              ? 'paragraph' 
              : editor.isActive('heading', { level: 1 }) 
                ? 'h1' 
                : editor.isActive('heading', { level: 2 }) 
                  ? 'h2' 
                  : editor.isActive('heading', { level: 3 }) 
                    ? 'h3' 
                    : 'paragraph'
          }
          className="p-1 text-sm border rounded hover:bg-gray-100"
        >
          <option value="paragraph">Normal</option>
          <option value="h1">Titre 1</option>
          <option value="h2">Titre 2</option>
          <option value="h3">Titre 3</option>
        </select>

        <div className="border-l h-6 mx-2"></div>

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Gras"
        >
          <FaBold />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Italique"
        >
          <FaItalic />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded ${editor.isActive('underline') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Souligné"
        >
          <FaUnderline />
        </button>

        <div className="border-l h-6 mx-2"></div>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Liste à puces"
        >
          <FaListUl />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Liste numérotée"
        >
          <FaListOl />
        </button>

        <div className="border-l h-6 mx-2"></div>

        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Aligner à gauche"
        >
          <FaAlignLeft />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Centrer"
        >
          <FaAlignCenter />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Aligner à droite"
        >
          <FaAlignRight />
        </button>

        <div className="border-l h-6 mx-2"></div>

        <div className="relative">
          <button
            onClick={() => setShowLinkMenu(!showLinkMenu)}
            className={`p-2 rounded ${editor.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title="Lien"
          >
            <FaLink />
          </button>
          {showLinkMenu && (
            <div className="absolute z-10 mt-1 p-2 bg-white rounded-md shadow-lg border flex gap-2">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="p-1 text-sm border rounded"
              />
              <button
                onClick={setLink}
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowTablePopup(true)}
            className="p-2 rounded hover:bg-gray-100"
            title="Tableau"
          >
            <FaTable />
          </button>
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor?.isActive('table')}
            className={`p-2 rounded ${!editor?.isActive('table') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:text-red-500'}`}
            title="Supprimer le tableau"
          >
            <FaTrash />
          </button>
          {/* Dans la partie Tableau du JSX */}
{showTablePopup && (
  <div className="absolute z-50 left-0 mt-2 w-64 bg-white rounded-md shadow-lg border">
    <div className="p-3 border-b">
      <h3 className="text-sm font-medium">Insérer un tableau</h3>
    </div>
    <div className="p-3">
      {/* Changement ici : grid-cols-9 au lieu de grid-cols-6 */}
      <div className="grid grid-cols-9 gap-1 mb-2">
        {[...Array(9)].map((_, i) =>  // Changé de 6 à 9
          [...Array(9)].map((_, j) =>  // Changé de 6 à 9
            <div
              key={`${i}-${j}`}
              className={`w-6 h-6 border cursor-pointer ${
                i < tableSize.rows && j < tableSize.cols
                  ? 'bg-blue-500'
                  : 'bg-gray-100'
              }`}
              onMouseEnter={() => handleHoverTableSize(i + 1, j + 1)}
              onClick={handleTableInsert}
            />
          ))
        }
      </div>
      <div className="text-center text-xs text-gray-500">
        {tableSize.rows} × {tableSize.cols}
      </div>
      <button
        onClick={handleTableInsert}
        className="mt-2 w-full py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Insérer
      </button>
    </div>
  </div>
)}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              const url = window.prompt('Entrez l\'URL de l\'image');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className="p-2 rounded hover:bg-gray-100"
            title="Insérer une image"
          >
            <FaImage />
          </button>
        </div>
        <div className="relative">
          <label className="p-2 rounded hover:bg-gray-100 cursor-pointer" title="Uploader une image">
            <FaUpload />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex bg-white shadow-lg rounded-md overflow-hidden border divide-x">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 ${editor.isActive('bold') ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <FaBold />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 ${editor.isActive('italic') ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <FaItalic />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 ${editor.isActive('underline') ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <FaUnderline />
            </button>
            <button
              onClick={() => {
                const previousUrl = editor.getAttributes('link').href;
                setLinkUrl(previousUrl || '');
                setShowLinkMenu(true);
              }}
              className={`p-2 ${editor.isActive('link') ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <FaLink />
            </button>
            {editor.isActive('table') && (
              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-2 hover:bg-red-50 text-red-500"
                title="Supprimer le tableau"
              >
                <FaTrash />
              </button>
            )}
          </div>
        </BubbleMenu>
      )}

<div className="flex-1 overflow-auto">
      <EditorContent 
        editor={editor}
        className="tiptap-editor"
        style={{ 
          minHeight: '100%',
          overflow: 'visible' // Important pour le contenu éditable
        }}
        ref={editorRef}
      />
    </div>
    </div>
  );
}