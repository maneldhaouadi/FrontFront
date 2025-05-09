'use client';

import { useEditor, EditorContent, BubbleMenu, Extension } from '@tiptap/react';
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
import { FaTrash, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaListUl, FaListOl, FaLink, FaTable, FaCode, FaSave, FaUndo, FaRedo, FaPalette, FaFont, FaImage, FaUpload, FaGripLinesVertical, FaShapes, FaGripLines } from 'react-icons/fa';
import { BiUndo, BiRedo } from 'react-icons/bi';
import { TemplateFieldsPanel } from './TemplateFielsPanel';
import { ChevronDown, Edit2, X } from 'lucide-react';
import { Template, TemplateType, TemplateTypeValues } from '@/types/template';
import { templateApi } from '@/api';
import Image from '@tiptap/extension-image'; 
import { Node } from '@tiptap/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const lowlight = createLowlight(common);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    stamp: {
      setStamp: (options: { src: string }) => ReturnType;
    };
    signature: {
      setSignature: (options: { src: string }) => ReturnType;
    };
    shape: {
      setShape: (options: { 
        type: string;
        color: string;
        width: string;
        height: string;
        align: string;
      }) => ReturnType;
    };
    verticalRule: {
      setVerticalRule: (options: { 
        height: string;
        thickness: string;
        color: string;
        align: string;
      }) => ReturnType;
    };
    horizontalRule: {
      setHorizontalRule: () => ReturnType;
    };
  }
}

interface ShapeOptions {
  type: string;
  color: string;
  width: string;
  height: string;
  align: string;
}

interface VerticalRuleOptions {
  height: string;
  thickness: string;
  color: string;
  align: string;
}

const Stamp = Node.create({
  name: 'stamp',
  group: 'block',
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'document-stamp',
      },
    };
  },

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
        default: '150px',
      },
      height: {
        default: 'auto',
      },
      align: {
        default: 'left',
      }
    };
  },

  addCommands() {
    return {
      setStamp: (options: { src: string }) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { align, ...rest } = HTMLAttributes;
    return [
      'div', 
      { 
        class: 'document-stamp-container',
        style: `float: ${align || 'left'}; margin-${align === 'right' ? 'left' : 'right'}: 10px;`
      },
      ['img', { ...rest, class: 'document-stamp-image' }],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div.document-stamp-container img',
      },
    ];
  },
});

const Signature = Node.create({
  name: 'signature',
  group: 'block',
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'document-signature',
      },
    };
  },

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
        default: '200px',
      },
      height: {
        default: 'auto',
      },
      align: {
        default: 'left',
      }
    };
  },

  addCommands() {
    return {
      setSignature: (options: { src: string }) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { align, ...rest } = HTMLAttributes;
    return [
      'div', 
      { 
        class: 'document-signature-container',
        style: `float: ${align || 'left'}; margin-${align === 'right' ? 'left' : 'right'}: 10px;`
      },
      ['img', { ...rest, class: 'document-signature-image' }],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div.document-signature-container img',
      },
    ];
  },
});

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
      },
      height: {
        default: null,
      },
      align: {
        default: 'left',
        renderHTML: (attributes: { align?: string }) => {
          if (!attributes.align) return {};
          
          return {
            style: `float: ${attributes.align}; margin-${attributes.align === 'left' ? 'right' : 'left'}: 10px;`,
          };
        }
      }
    };
  },
  
  renderHTML({ HTMLAttributes }) {
    const { align, ...rest } = HTMLAttributes;
    
    return [
      'div',
      { 
        class: 'resizable-image-container',
        style: align ? `float: ${align}; margin-${align === 'left' ? 'right' : 'left'}: 10px;` : ''
      },
      ['img', rest],
      ['div', { class: 'resize-handle' }]
    ];
  },
  
  parseHTML() {
    return [
      {
        tag: 'div.resizable-image-container img',
        getAttrs: (node: HTMLElement | string) => {
          if (typeof node === 'string') return false;
          
          const parent = node.parentElement;
          if (!parent || !parent.classList.contains('resizable-image-container')) return false;
          
          const style = parent.getAttribute('style') || '';
          const align = style.includes('float: right') ? 'right' : 
                       style.includes('float: left') ? 'left' : 'left';
                       
          return {
            align
          };
        }
      }
    ];
  }
});

const HorizontalRule = Extension.create({
  name: 'horizontalRule',
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'horizontal-rule',
      },
    };
  },
  addCommands() {
    return {
      setHorizontalRule: () => ({ commands }: { commands: any }) => {
        return commands.insertContent('<hr class="horizontal-rule" />');
      },
    };
  },
});

const Shape = Node.create({
  name: 'shape',
  group: 'block',
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'document-shape',
      },
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'rectangle',
      },
      color: {
        default: '#000000',
      },
      width: {
        default: '100px',
      },
      height: {
        default: '50px',
      },
      align: {
        default: 'left',
      }
    };
  },

  addCommands() {
    return {
      setShape: (options: ShapeOptions) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { type, color, width, height, align, ...rest } = HTMLAttributes;
    let shapeContent = '';
    
    if (type === 'triangle') {
      shapeContent = `
        <svg width="${width}" height="${height}" viewBox="0 0 100 100">
          <polygon points="50,0 100,100 0,100" fill="${color}"/>
        </svg>
      `;
    } else if (type === 'circle') {
      shapeContent = `
        <svg width="${width}" height="${height}" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="${color}"/>
        </svg>
      `;
    } else { // rectangle par défaut
      shapeContent = `
        <svg width="${width}" height="${height}" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="${color}"/>
        </svg>
      `;
    }

    return [
      'div', 
      { 
        class: 'document-shape-container',
        style: `display: inline-block; margin: 10px; float: ${align || 'left'};`
      },
      ['div', { innerHTML: shapeContent }],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div.document-shape-container',
      },
    ];
  },
});

const VerticalRule = Node.create({
  name: 'verticalRule',
  group: 'block',
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'vertical-rule',
      },
    };
  },

  addAttributes() {
    return {
      height: {
        default: '100px',
      },
      thickness: {
        default: '2px',
      },
      color: {
        default: '#000000',
      },
      align: {
        default: 'left',
      }
    };
  },

  addCommands() {
    return {
      setVerticalRule: (options: VerticalRuleOptions) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { height, thickness, color, align, ...rest } = HTMLAttributes;
    return [
      'div', 
      { 
        class: 'vertical-rule-container',
        style: `display: inline-block; height: ${height}; float: ${align || 'left'}; margin: 0 10px;`
      },
      ['div', { 
        style: `width: ${thickness}; height: 100%; background-color: ${color}; display: inline-block;` 
      }],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div.vertical-rule-container',
      },
    ];
  },
});
interface TiptapEditorProps {
  value: string;
  onChange: (content: string) => void;
  templateId?: number;
  templateData?: Template;
  onSaveComplete?: () => void;
  onLoad?: () => void;
  templateName: string; // Ajouté
  onNameChange?: (newName: string) => Promise<void>; // Ajouté
}

export default function TiptapEditor({
  value,
  onChange,
  templateId,
  templateData,
  onSaveComplete,
  onLoad,
  templateName,
  onNameChange,
}: TiptapEditorProps) {
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableSize, setTableSize] = useState({ rows: 1, cols: 1 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(templateName);
  const [isSavingName, setIsSavingName] = useState(false);
  const handleSaveName = async () => {
    if (!onNameChange || editedName === templateName) {
      setIsEditingName(false);
      return;
    }
    
    try {
      setIsSavingName(true);
      await onNameChange(editedName);
      setIsEditingName(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom", error);
      setEditedName(templateName); // Revert on error
    } finally {
      setIsSavingName(false);
    }
  };
  
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

  const [resizing, setResizing] = useState(false);
  const [startSize, setStartSize] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [currentImage, setCurrentImage] = useState<HTMLElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showShapePopup, setShowShapePopup] = useState(false);
const [shapeConfig, setShapeConfig] = useState({
  type: 'rectangle',
  color: '#000000',
  width: '100px',
  height: '50px',
  align: 'left'
});
  const colorPalette = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#00ffff', '#ff00ff', '#c0c0c0', '#808080',
    '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
  ];

  const editor = useEditor({
    extensions: [
      Stamp,
      Signature,
      CustomImage, // Add this line
      HorizontalRule,
      Shape,
      VerticalRule,
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
          style: 'border: 1px solid #1e293b !important; border-collapse: collapse;'
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
          style: 'border: 1px solid #94a3b8 !important;'
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-800 bg-gray-100 font-bold p-2',
          style: 'border: 1px solid #1e293b !important;'
        },
      }),
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

  const insertCustomShape = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setShape(shapeConfig).run();
    setShowShapePopup(false);
  }, [editor, shapeConfig]);
  
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
      }, [resizing, startSize, currentImage, editor]);

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
          width: '300px',
          height: 'auto',
          align: 'left'
        }).run();
      };
      reader.readAsDataURL(file);
    },
    [editor]
  );

  const applyColor = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setColor(currentColor).run();
    setShowColorPicker(false);
  }, [editor, currentColor]);

  const handleHoverTableSize = (rows: number, cols: number) => {
    setTableSize({
      rows: Math.min(rows, 9),
      cols: Math.min(cols, 9),
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
    
    // 1. Si le champ contient déjà une syntaxe EJS ou similaire, l'insérer tel quel
    if (fieldPath.match(/<%=|{%/)) {
      editor.commands.insertContent(fieldPath);
      return;
    }
  
    // 2. Si le champ utilise la syntaxe {{variable}}
    if (fieldPath.includes('{{')) {
      const convertedField = fieldPath.replace(/\{\{(.+?)\}\}/g, `<%= ${fieldType}.$1 %>`);
      editor.commands.insertContent(convertedField);
      return;
    }
  
    // 3. Cas standard - insérer avec le préfixe du type
    editor.commands.insertContent(`<%= ${fieldType}.${fieldPath} %>`);
    
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
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
      <div className="border-b bg-gray-50 p-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="h-8 w-64"
              disabled={isSavingName}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSaveName}
              disabled={isSavingName}
            >
              <FaSave className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setIsEditingName(false);
                setEditedName(templateName);
              }}
              disabled={isSavingName}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">{templateName}</h2>
            {onNameChange && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingName(true)}
                className="text-muted-foreground hover:text-primary"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
      
      <Button 
        onClick={handleSave}
        variant="outline"
        size="sm"
        className="ml-auto"
      >
        <FaSave className="mr-2 h-4 w-4" />
        Enregistrer
      </Button>
    </div>
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

        {showShapePopup && (
  <div className="absolute z-50 left-0 mt-2 w-64 bg-white rounded-md shadow-lg border p-3">
    <h3 className="text-sm font-medium mb-2">Configurer la forme</h3>
    
    <div className="mb-2">
      <label className="block text-xs mb-1">Type</label>
      <select 
        value={shapeConfig.type}
        onChange={(e) => setShapeConfig({...shapeConfig, type: e.target.value})}
        className="w-full p-1 border rounded text-sm"
      >
        <option value="rectangle">Rectangle</option>
        <option value="triangle">Triangle</option>
        <option value="circle">Cercle</option>
      </select>
    </div>
    
    <div className="mb-2">
      <label className="block text-xs mb-1">Couleur</label>
      <input 
        type="color" 
        value={shapeConfig.color}
        onChange={(e) => setShapeConfig({...shapeConfig, color: e.target.value})}
        className="w-full"
      />
    </div>
    
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div>
        <label className="block text-xs mb-1">Largeur</label>
        <input 
          type="text" 
          value={shapeConfig.width}
          onChange={(e) => setShapeConfig({...shapeConfig, width: e.target.value})}
          className="w-full p-1 border rounded text-sm"
          placeholder="100px"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Hauteur</label>
        <input 
          type="text" 
          value={shapeConfig.height}
          onChange={(e) => setShapeConfig({...shapeConfig, height: e.target.value})}
          className="w-full p-1 border rounded text-sm"
          placeholder="50px"
        />
      </div>
    </div>
    
    <div className="mb-3">
      <label className="block text-xs mb-1">Alignement</label>
      <select 
        value={shapeConfig.align}
        onChange={(e) => setShapeConfig({...shapeConfig, align: e.target.value})}
        className="w-full p-1 border rounded text-sm"
      >
        <option value="left">Gauche</option>
        <option value="center">Centre</option>
        <option value="right">Droite</option>
      </select>
    </div>
    {/* Bouton Forme avec icône */}
<button
  onClick={() => setShowShapePopup(!showShapePopup)}
  className={`p-2 rounded ${editor.isActive('shape') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
  title="Insérer une forme"
>
  <FaShapes />
</button>

{/* Bouton Ligne Horizontale avec icône */}
<button
  onClick={() => editor.chain().focus().setHorizontalRule().run()}
  className={`p-2 rounded ${editor.isActive('horizontalRule') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
  title="Insérer une ligne horizontale"
>
  <FaGripLines />
</button>

{/* Bouton Ligne Verticale avec icône */}
<button
  onClick={() => editor.chain().focus().setVerticalRule({
    height: '100px',
    thickness: '2px',
    color: '#000000',
    align: 'left'
  }).run()}
  className={`p-2 rounded ${editor.isActive('verticalRule') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
  title="Insérer une ligne verticale"
>
  <FaGripLinesVertical />
</button>
    
    <button
      onClick={insertCustomShape}
      className="w-full py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Insérer
    </button>
  </div>
)}

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
  onClick={() => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { align: 'left' }).run();
    } else {
      editor.chain().focus().setTextAlign('left').run();
    }
  }}
  className={`p-2 rounded ${editor.isActive({ textAlign: 'left' }) || 
    (editor.isActive('image') && editor.getAttributes('image').align === 'left') ? 
    'bg-gray-200' : 'hover:bg-gray-100'}`}
  title="Aligner à gauche"
>
  <FaAlignLeft />
</button>

<button
  onClick={() => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { align: 'center' }).run();
    } else {
      editor.chain().focus().setTextAlign('center').run();
    }
  }}
  className={`p-2 rounded ${editor.isActive({ textAlign: 'center' }) || 
    (editor.isActive('image') && editor.getAttributes('image').align === 'center') ? 
    'bg-gray-200' : 'hover:bg-gray-100'}`}
  title="Centrer"
>
  <FaAlignCenter />
</button>

<button
  onClick={() => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { align: 'right' }).run();
    } else {
      editor.chain().focus().setTextAlign('right').run();
    }
  }}
  className={`p-2 rounded ${editor.isActive({ textAlign: 'right' }) || 
    (editor.isActive('image') && editor.getAttributes('image').align === 'right') ? 
    'bg-gray-200' : 'hover:bg-gray-100'}`}
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
          {showShapePopup && (
  <div className="absolute z-50 left-0 mt-2 w-64 bg-white rounded-md shadow-lg border p-3">
    <h3 className="text-sm font-medium mb-2">Configurer la forme</h3>
    
    <div className="mb-2">
      <label className="block text-xs mb-1">Type</label>
      <select 
        value={shapeConfig.type}
        onChange={(e) => setShapeConfig({...shapeConfig, type: e.target.value})}
        className="w-full p-1 border rounded text-sm"
      >
        <option value="rectangle">Rectangle</option>
        <option value="triangle">Triangle</option>
        <option value="circle">Cercle</option>
      </select>
    </div>
    
    <div className="mb-2">
      <label className="block text-xs mb-1">Couleur</label>
      <input 
        type="color" 
        value={shapeConfig.color}
        onChange={(e) => setShapeConfig({...shapeConfig, color: e.target.value})}
        className="w-full"
      />
    </div>
    
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div>
        <label className="block text-xs mb-1">Largeur</label>
        <input 
          type="text" 
          value={shapeConfig.width}
          onChange={(e) => setShapeConfig({...shapeConfig, width: e.target.value})}
          className="w-full p-1 border rounded text-sm"
          placeholder="100px"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Hauteur</label>
        <input 
          type="text" 
          value={shapeConfig.height}
          onChange={(e) => setShapeConfig({...shapeConfig, height: e.target.value})}
          className="w-full p-1 border rounded text-sm"
          placeholder="50px"
        />
      </div>
    </div>
    
    <div className="mb-3">
      <label className="block text-xs mb-1">Alignement</label>
      <select 
        value={shapeConfig.align}
        onChange={(e) => setShapeConfig({...shapeConfig, align: e.target.value})}
        className="w-full p-1 border rounded text-sm"
      >
        <option value="left">Gauche</option>
        <option value="center">Centre</option>
        <option value="right">Droite</option>
      </select>
    </div>
    
    <button
    onClick={() => setShowShapePopup(!showShapePopup)}
    className="p-2 rounded hover:bg-gray-100"
    title="Insérer une forme"
  >
    Forme
  </button>

  {/* Bouton pour la ligne horizontale */}
  <button
    onClick={() => editor.chain().focus().setHorizontalRule().run()}
    className="p-2 rounded hover:bg-gray-100"
    title="Insérer une ligne horizontale"
  >
    Ligne Horizontale
  </button>

  {/* Bouton pour la ligne verticale */}
  <button
    onClick={() => editor.chain().focus().setVerticalRule({
      height: '100px',
      thickness: '2px',
      color: '#000000',
      align: 'left'
    }).run()}
    className="p-2 rounded hover:bg-gray-100"
    title="Insérer une ligne verticale"
  >
    Ligne Verticale
  </button>
  </div>
)}
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
         {/* Bouton pour ajouter un cachet */}
<div className="relative">
  <button
    onClick={() => {
      const url = window.prompt('Entrez l\'URL du cachet');
      if (url) {
        editor.chain().focus().setStamp({ src: url }).run();
      }
    }}
    className="p-2 rounded hover:bg-gray-100"
    title="Ajouter un cachet"
  >
    Cachet
  </button>
</div>

{/* Bouton pour ajouter une signature */}
<div className="relative">
  <button
    onClick={() => {
      const url = window.prompt('Entrez l\'URL de la signature');
      if (url) {
        editor.chain().focus().setSignature({ src: url }).run();
      }
    }}
    className="p-2 rounded hover:bg-gray-100"
    title="Ajouter une signature"
  >
    Signature
  </button>
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
        minHeight: '100%', // S'adapte à la hauteur disponible
        overflow: 'visible' // Permet au contenu de déborder si nécessaire
      }}
      ref={editorRef}
    />
  </div>
    </div>
  );
}