'use client';

import { useTheme } from '@lib/hooks/use-theme';
import { cn } from '@lib/utils';

import React, { useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'item' | 'separator';
}

interface DropdownProps {
  trigger: React.ReactNode;
  items?: DropdownItem[];
  children?: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  children,
  className,
}) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number | 'auto';
    left: number | 'auto';
    right: number | 'auto';
    bottom: number | 'auto';
  }>({ top: 0, left: 0, right: 'auto', bottom: 'auto' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // 计算dropdown位置（固定向左上方弹出）
  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();

    // 固定向左上方弹出：dropdown的右下角对齐button的位置
    const newPosition = {
      top: 'auto' as const,
      left: 'auto' as const,
      right: window.innerWidth - triggerRect.right,
      bottom: window.innerHeight - triggerRect.top + 4,
    };

    setPosition(newPosition);
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 当菜单打开时计算位置
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen]);

  return (
    <div className={cn('relative inline-block', className)} ref={dropdownRef}>
      {/* Trigger */}
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {/* Dropdown menu - uses fixed positioning based on entire page */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-[9999] max-w-[240px] min-w-[200px] rounded-lg border shadow-xl',
            isDark
              ? 'border-stone-700 bg-stone-800'
              : 'border-stone-200 bg-white'
          )}
          style={{
            top:
              typeof position.top === 'number' ? `${position.top}px` : 'auto',
            left:
              typeof position.left === 'number' ? `${position.left}px` : 'auto',
            right:
              typeof position.right === 'number'
                ? `${position.right}px`
                : 'auto',
            bottom:
              typeof position.bottom === 'number'
                ? `${position.bottom}px`
                : 'auto',
          }}
        >
          {children ? (
            <div onClick={() => setIsOpen(false)}>{children}</div>
          ) : items ? (
            <div className="py-1">
              {items.map((item, index) => {
                if (item.type === 'separator') {
                  return (
                    <div
                      key={index}
                      className={cn(
                        'mx-2 my-1 h-px',
                        isDark ? 'bg-stone-700' : 'bg-stone-200'
                      )}
                    />
                  );
                }

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick();
                        setIsOpen(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left font-serif text-sm transition-colors',
                      item.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : isDark
                          ? 'text-stone-300 hover:bg-stone-700'
                          : 'text-stone-700 hover:bg-stone-100',
                      item.className
                    )}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0">{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
