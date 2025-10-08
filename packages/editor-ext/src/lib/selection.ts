import { Extension } from "@tiptap/core";
import {Plugin, PluginKey, TextSelection} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const Selection = Extension.create({
  name: "selection",

  addOptions() {
    return {
      onRightClick: null,
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const { onRightClick } = this.options;

    return [
      new Plugin({
        key: new PluginKey("selection"),
        props: {
          decorations(state) {
            if (state.selection.empty) {
              return null;
            }

            if (editor.isFocused === true) {
              return null;
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(state.selection.from, state.selection.to, {
                class: "selection",
              }),
            ]);
          },
        },
      }),
      new Plugin({
        key: new PluginKey("right-click-menu"),
        props: {
          handleDOMEvents: {
            contextmenu: (view, event) => {
              event.preventDefault();
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) return false;
              const { doc } = view.state;
              const resolvedPos = doc.resolve(pos.pos);
              const { from, to } = view.state.selection;
              if (from !== to) return false;
              const word = resolvedPos.parent.childAfter(resolvedPos.parentOffset);
              if (word.node && word.node.isText) {
                const start = resolvedPos.start();
                const offset = resolvedPos.parentOffset;
                const text = resolvedPos.parent.textBetween(0, resolvedPos.parent.content.size, " ");
                const before = text.slice(0, offset).split(" ").pop()?.length ?? 0;
                const after = text.slice(offset).split(" ")[0]?.length ?? 0;
                const fromPos = Math.max(pos.pos - before, start);
                const toPos = Math.min(pos.pos + after, doc.content.size);
                const tr = view.state.tr.setSelection(
                  TextSelection.create(doc, fromPos, toPos)
                );
                view.dispatch(tr);
                view.focus();
                return true;
              }
              const tr = view.state.tr.setSelection(
                TextSelection.near(resolvedPos)
              );
              view.dispatch(tr);
              view.focus();
              return true;
            },
          },
        },
      })
    ];
  },
});

export default Selection;
