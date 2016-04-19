import Dispatcher from './utils/Dispatcher';
import { AMA, APA } from './utils/Parsers';
import { parseInlineCitationString } from './utils/HelperFunctions';
import ABTEvent from './utils/Events';

declare var tinyMCE, ABT_locationInfo

tinyMCE.PluginManager.add('abt_main_menu', (editor: tinyMCEEditor, url: string) => {

    /**
     * Responsible for opening the formatted reference window and serving the reference
     * @type {Function}
     */
    const openFormattedReferenceWindow = () => {
        editor.windowManager.open(<TinyMCEWindowMangerObject>{
            title: 'Insert Formatted Reference',
            url: ABT_locationInfo.tinymceViewsURL + 'reference-window.html',
            width: 600,
            height: 10,
            params: {
                baseUrl: ABT_locationInfo.tinymceViewsURL,
                preferredStyle: ABT_locationInfo.preferredCitationStyle,
            },
            onclose: (e: any) => {

                // If the user presses the exit button, return.
                if (Object.keys(e.target.params).length === 0) {
                    return;
                }

                editor.setProgressState(1);
                let payload: ReferenceFormData = e.target.params.data;
                let dispatcher = new Dispatcher(payload);

                if (payload.addManually === true) {
                    let data = dispatcher.fromManualInput(payload);
                    deliverContent(data, payload);
                    return;
                }

                dispatcher.fromPMID(payload.pmidList, (data) => {
                    deliverContent(data, payload);
                });
            },
        });
    };
    editor.addShortcut('meta+alt+r', 'Insert Formatted Reference', openFormattedReferenceWindow);

    /**
     * Responsible for serving the reference payload once generated
     * @type {Function}
     */
    const deliverContent = (data: Error|string[], payload: { attachInline: boolean }) => {
        if (data instanceof Error) {
            editor.windowManager.alert(data.message);
            editor.setProgressState(0);
            return;
        }
        else {
            let smartBib = generateSmartBib();
            let reflist: number[] = [];

            data.forEach((ref) => {
                let li = document.createElement('LI') as HTMLLIElement;
                li.innerHTML = ref;
                smartBib.appendChild(li);
                reflist.push(smartBib.children.length - 1);
                dispatchEvent(new CustomEvent(ABTEvent.REFERENCE_ADDED, { detail: ref }));
            });

            if (payload.attachInline) {
                editor.insertContent(
                    `<span class="abt_cite noselect mceNonEditable" contenteditable="false" data-reflist="[${reflist}]">` +
                    `[${parseInlineCitationString(reflist.map(i => i + 1))}]</span>`
                );
            }

            editor.setProgressState(0);
        }
    }

    /**
     * Generates a Smart Bibliography in the editor and returns the list element.
     * @type {Function}
     * @return {HTMLOListElement}  The Smart Bibliography OL element.
     */
    const generateSmartBib = (): HTMLOListElement => {
        let doc: HTMLDocument = editor.dom.doc;
        let existingSmartBib: HTMLOListElement = <HTMLOListElement>doc.getElementById('abt-smart-bib');

        if (!existingSmartBib) {
            let container = doc.createElement('DIV') as HTMLDivElement;
            let smartBib = doc.createElement('OL') as HTMLOListElement;
            let horizontalRule = doc.createElement('HR') as HTMLHRElement;
            let comment = doc.createComment(`Smart Bibliography Generated By Academic Blogger's Toolkit`);

            container.id = 'abt-smart-bib-container';
            container.className = 'mceNonEditable';
            container.contentEditable = 'false';
            smartBib.id = 'abt-smart-bib';
            horizontalRule.className = 'abt_editor-only';

            container.appendChild(comment);
            container.appendChild(horizontalRule);
            container.appendChild(smartBib);

            doc.body.appendChild(container);

            return smartBib;
        }

        return existingSmartBib;
    }


    // TinyMCE Menu Items
    const separator: TinyMCEMenuItem = { text: '-' };

    const requestTools: TinyMCEMenuItem = {
        text: 'Request More Tools',
        onclick: () => {
            editor.windowManager.open({
                title: 'Request More Tools',
                body: [{
                    type: 'container',
                    html:
                    `<div style="text-align: center;">` +
                    `Have a feature or tool in mind that isn't available?<br>` +
                    `<a ` +
                    `href="https://github.com/dsifford/academic-bloggers-toolkit/issues" ` +
                    `style="color: #00a0d2;" ` +
                    `target="_blank">Open an issue</a> on the GitHub repository and let me know!` +
                    `</div>`,
                }],
                buttons: [],
            });
        }
    }

    const keyboardShortcuts: TinyMCEMenuItem = {
        text: 'Keyboard Shortcuts',
        onclick: () => {
            editor.windowManager.open({
                title: 'Keyboard Shortcuts',
                url: ABT_locationInfo.tinymceViewsURL + 'keyboard-shortcuts.html',
                width: 400,
                height: 70,
            });
        }
    }

    const importRefs: TinyMCEMenuItem = {
        text: 'Import References',
        onclick: () => {
            editor.windowManager.open(<TinyMCEWindowMangerObject>{
                title: 'Import References',
                url: ABT_locationInfo.tinymceViewsURL + 'import-window.html',
                width: 600,
                height: 10,
                params: {
                    baseUrl: ABT_locationInfo.tinymceViewsURL,
                    preferredStyle: ABT_locationInfo.preferredCitationStyle,
                },
                onclose: (e: any) => {
                    // If the user presses the exit button, return.
                    if (Object.keys(e.target.params).length === 0) {
                        return;
                    }

                    editor.setProgressState(1);

                    let data: {
                        filename: string,
                        payload: ReferenceObj[],
                        format: 'ama'|'apa',
                    } = e.target.params.data;

                    let payload = data.payload;
                    let refArray: string[] = [];

                    switch (data.format) {
                        case 'ama':
                            payload.forEach((ref: ReferenceObj, i: number) => {
                                let ama = new AMA(false, ref.type);
                                let parsedRef = ama.parse([ref]);
                                if (parsedRef instanceof Error) {
                                    editor.windowManager.alert(`Error => An error occured while parsing reference ${i}`);
                                    return;
                                }
                                else {
                                    refArray.push(...parsedRef);
                                }
                            });
                            break;
                        case 'apa':
                            payload.forEach((ref: ReferenceObj, i: number) => {
                                let apa = new APA(false, ref.type);
                                let parsedRef = apa.parse([ref]);
                                if (parsedRef instanceof Error) {
                                    editor.windowManager.alert(`Error => An error occured while parsing reference ${i}`);
                                    return;
                                }
                                else {
                                    refArray.push(...parsedRef);
                                }
                            });
                            break;
                        default:
                            editor.windowManager.alert('Error => Could not establish selected citation type.');
                            editor.setProgressState(0);
                            return;
                    }

                    deliverContent(refArray, { attachInline: false });
                    editor.setProgressState(0);
                    return;

                },
            });
        },
    }


    // Event Handlers
    editor.on('init', () => {
        addEventListener(ABTEvent.INSERT_REFERENCE, openFormattedReferenceWindow);
        dispatchEvent(new CustomEvent(ABTEvent.TINYMCE_READY));
    });

    editor.on('remove', () => {
        removeEventListener(ABTEvent.INSERT_REFERENCE, openFormattedReferenceWindow);
    });


    // Register Button
    const ABT_Button = {
        id: 'abt_menubutton',
        type: 'menubutton',
        icon: 'abt_menu dashicons-welcome-learn-more',
        title: 'Academic Blogger\'s Toolkit',
        menu: [
            importRefs,
            separator,
            keyboardShortcuts,
            requestTools,
        ],
    };
    editor.addButton('abt_main_menu', ABT_Button);

});
