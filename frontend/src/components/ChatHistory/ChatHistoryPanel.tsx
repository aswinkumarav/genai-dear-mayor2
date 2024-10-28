import { CommandBarButton, ContextualMenu, DefaultButton, Dialog, DialogFooter, DialogType, ICommandBarStyles, IContextualMenuItem, IStackStyles, PrimaryButton, Spinner, SpinnerSize, Stack, StackItem, Text } from "@fluentui/react";
import { useBoolean } from '@fluentui/react-hooks';

import styles from "./ChatHistoryPanel.module.css"
import { useContext } from "react";
import { AppStateContext } from "../../state/AppProvider";
import React from "react";
import ChatHistoryList from "./ChatHistoryList";
import { ChatHistoryLoadingState, historyDeleteAll } from "../../api";
import IconButton from "../IconButton/IconButton";
import SidebarLaunchLogo from '../../assets/sidebar-launch-logo.svg?react';
import Close from '../../assets/i-close.svg?react';

interface ChatHistoryPanelProps {

}

export enum ChatHistoryPanelTabs {
    History = "History"
}

const commandBarStyle: ICommandBarStyles = {
    root: {
        padding: '0',
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'transparent'
    },
};

const commandBarButtonStyle: Partial<IStackStyles> = { root: { height: '50px' } };

export function ChatHistoryPanel(props: ChatHistoryPanelProps) {
    const appStateContext = useContext(AppStateContext)
    const [showContextualMenu, setShowContextualMenu] = React.useState(false);
    const [hideClearAllDialog, { toggle: toggleClearAllDialog }] = useBoolean(true);
    const [clearing, setClearing] = React.useState(false)
    const [clearingError, setClearingError] = React.useState(false)

    const clearAllDialogContentProps = {
        type: DialogType.close,
        title: !clearingError ? 'Are you sure you want to clear all chat history?' : 'Error deleting all of chat history',
        closeButtonAriaLabel: 'Close',
        subText: !clearingError ? 'All chat history will be permanently removed.' : 'Please try again. If the problem persists, please contact the site administrator.',
    };

    const modalProps = {
        titleAriaId: 'labelId',
        subtitleAriaId: 'subTextId',
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
    }

    const menuItems: IContextualMenuItem[] = [
        { key: 'clearAll', text: 'Clear all chat history', iconProps: { iconName: 'Delete' } },
    ];

    const handleHistoryClick = () => {
        appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })
    };

    const onShowContextualMenu = React.useCallback((ev: React.MouseEvent<HTMLElement>) => {
        ev.preventDefault(); // don't navigate
        setShowContextualMenu(true);
    }, []);

    const onHideContextualMenu = React.useCallback(() => setShowContextualMenu(false), []);

    const onClearAllChatHistory = async () => {
        setClearing(true)
        let response = await historyDeleteAll()
        if (!response.ok) {
            setClearingError(true)
        } else {
            appStateContext?.dispatch({ type: 'DELETE_CHAT_HISTORY' })
            toggleClearAllDialog();
        }
        setClearing(false);
    }

    const onHideClearAllDialog = () => {
        toggleClearAllDialog()
        setTimeout(() => {
            setClearingError(false)
        }, 2000);
    }

    React.useEffect(() => { }, [appStateContext?.state.chatHistory, clearingError]);

    return (
        <div className="flex w-[272px] h-screen md:relative absolute md:z-0 z-10 py-2 px-2 border-r bg-chat-default dark:bg-chat-dark border-r-interactive-secondary flex-col items-start gap-0 shrink-0 self-stretch">
            <div className="space-y-3">
                <div className="flex items-center gap-20">
                    <div className="text-base font-semibold font-impact">
                        Chat History
                    </div>
                    <div className="p-2">
                        <IconButton
                            icon={<Close />}
                            tooltip={{ content: 'Close', place: 'bottom' }}
                            onClick={handleHistoryClick}
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <section className={styles.container} data-is-scrollable aria-label={"chat history panel"}>
                        <Stack aria-label="chat history panel content"
                            styles={{
                                root: {
                                    display: "flex",
                                    flexGrow: 1,
                                    flexDirection: "column",
                                    paddingTop: '2.5px',
                                    maxWidth: "100%"
                                },
                            }}
                            style={{
                                display: "flex",
                                flexGrow: 1,
                                flexDirection: "column",
                                flexWrap: "wrap",
                                padding: "1px"
                            }}>
                            <Stack className={styles.chatHistoryListContainer}>
                                {(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Success && appStateContext?.state.isCosmosDBAvailable.cosmosDB) && <ChatHistoryList />}
                                {(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail && appStateContext?.state.isCosmosDBAvailable) && <>
                                    <Stack>
                                        <Stack horizontalAlign='center' verticalAlign='center' style={{ width: "100%", marginTop: 10 }}>
                                            <StackItem>
                                                <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 16 }}>
                                                    {appStateContext?.state.isCosmosDBAvailable?.status && <span>{appStateContext?.state.isCosmosDBAvailable?.status}</span>}
                                                    {!appStateContext?.state.isCosmosDBAvailable?.status && <span>Error loading chat history</span>}

                                                </Text>
                                            </StackItem>
                                            <StackItem>
                                                <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 14 }}>
                                                    <span>Chat history can't be saved at this time</span>
                                                </Text>
                                            </StackItem>
                                        </Stack>
                                    </Stack>
                                </>}
                                {appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading && <>
                                    <Stack>
                                        <Stack horizontal horizontalAlign='center' verticalAlign='center' style={{ width: "100%", marginTop: 10 }}>
                                            <StackItem style={{ justifyContent: 'center', alignItems: 'center' }}>
                                                <Spinner style={{ alignSelf: "flex-start", height: "100%", marginRight: "5px" }} size={SpinnerSize.medium} />
                                            </StackItem>
                                            <StackItem>
                                                <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 14 }}>
                                                    <span style={{ whiteSpace: 'pre-wrap' }}>Loading chat history</span>
                                                </Text>
                                            </StackItem>
                                        </Stack>
                                    </Stack>
                                </>}
                            </Stack>
                        </Stack>
                        <Dialog
                            hidden={hideClearAllDialog}
                            onDismiss={clearing ? () => { } : onHideClearAllDialog}
                            dialogContentProps={clearAllDialogContentProps}
                            modalProps={modalProps}
                        >
                            <DialogFooter>
                                {!clearingError && <PrimaryButton onClick={onClearAllChatHistory} disabled={clearing} text="Clear All" />}
                                <DefaultButton onClick={onHideClearAllDialog} disabled={clearing} text={!clearingError ? "Cancel" : "Close"} />
                            </DialogFooter>
                        </Dialog>
                    </section>
                </div>
            </div>
            <div className="absolute bottom-0">
                <a
                    target="_blank"
                    href="https://launch.nttdata.com/"
                    className="flex flex-col gap-1 py-2"
                >
                    <p className="text-xs text-secondary-txt dark:text-default-txt-dark">
                        powered by
                    </p>
                    <SidebarLaunchLogo className="fill-default-txt dark:fill-default-txt-dark" />
                </a>
            </div>
        </div>

    );
}