/// <reference types="vite-plugin-svgr/client" />
import { Outlet, Link, useLocation } from "react-router-dom";
import styles from "./Layout.module.css";
import Contoso from "../../assets/AI-Logo.png";
import { CopyRegular } from "@fluentui/react-icons";
import { Dialog, Stack, TextField } from "@fluentui/react";
import { useContext, useEffect, useState } from "react";
import { HistoryButton, ShareButton } from "../../components/common/Button";
import { AppStateContext } from "../../state/AppProvider";
import { CosmosDBStatus } from "../../api";
import queryString from "query-string";
import IconButton from "../../components/IconButton/IconButton";
import Dropdown from "../../components/Dropdown/Dropdown";
import SidebarIcon from '../../assets/i-sidebar.svg?react';
import { ChatHistoryPanel } from "../../components/ChatHistory/ChatHistoryPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import rehypeRaw from "rehype-raw";
import DOMPurify from 'dompurify';
import { IoMdClose } from "react-icons/io";
import { XSSAllowTags } from "../../constants/xssAllowTags";
import { Citation } from "../../api";
import Close from '../../assets/i-close.svg?react';
import Button from '../../components/Button/Button';
import CommentIcon from '../../assets/i-comment.svg?react';


const Layout = () => {
    const [isSharePanelOpen, setIsSharePanelOpen] = useState<boolean>(false);
    const [copyClicked, setCopyClicked] = useState<boolean>(false);
    const [copyText, setCopyText] = useState<string>("Copy URL");
    const [shareLabel, setShareLabel] = useState<string | undefined>("Share");
    const [hideHistoryLabel, setHideHistoryLabel] = useState<string>("Hide chat history");
    const [showHistoryLabel, setShowHistoryLabel] = useState<string>("Show chat history");
    const appStateContext = useContext(AppStateContext)
    const ui = appStateContext?.state.frontendSettings?.ui;
    const location = useLocation();
    const { usecase } = queryString.parse(location.search);

    const handleShareClick = () => {
        setIsSharePanelOpen(true);
    };

    const handleSharePanelDismiss = () => {
        setIsSharePanelOpen(false);
        setCopyClicked(false);
        setCopyText("Copy URL");
    };

    const handleCopyClick = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopyClicked(true);
    };

    const handleHistoryClick = () => {
        appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })
    };

    useEffect(() => {
        if (copyClicked) {
            setCopyText("Copied URL");
        }
    }, [copyClicked]);

    useEffect(() => { }, [appStateContext?.state.isCosmosDBAvailable.status]);

    useEffect(() => {
        const handleResize = () => {
          if (window.innerWidth < 480) {
            setShareLabel(undefined)
            setHideHistoryLabel("Hide history")
            setShowHistoryLabel("Show history")
          } else {
            setShareLabel("Share")
            setHideHistoryLabel("Hide chat history")
            setShowHistoryLabel("Show chat history")
          }
        };
    
        window.addEventListener('resize', handleResize);
        handleResize();
    
        return () => window.removeEventListener('resize', handleResize);
      }, []);

    const closeCitation = () => {
        appStateContext?.dispatch({ type: 'TOGGLE_CITATION', payload: false });
        appStateContext?.dispatch({ type: 'SET_CITATION_MESSAGE', payload: undefined });
    }

    const onViewSource = (citation: Citation) => {
        if (citation.url && !citation.url.includes("blob.core")) {
            window.open(citation.url, "_blank");
        }
    };

    const newChat = () => {
        // setProcessMessages(messageStatus.Processing)
        // setMessages([])
        appStateContext?.dispatch({ type: 'SET_CITATION_MESSAGE', payload: undefined });
        appStateContext?.dispatch({ type: 'TOGGLE_CITATION', payload: false })
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null });
        // setProcessMessages(messageStatus.Done)
    };

    return (
        <div className={`flex relative w-screen h-screen bg-chat-white dark:bg-chat-dark dark:text-default-txt-dark transition-all duration-1000`}
            style={{paddingRight: ((appStateContext?.state.isChatHistoryOpen && appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) || appStateContext?.state.isCitaionOpen && appStateContext?.state.citationMessage) ? "0.5rem" : "1.5rem", paddingLeft: ((appStateContext?.state.isChatHistoryOpen && appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) || appStateContext?.state.isCitaionOpen && appStateContext?.state.citationMessage) ? "0.5rem" : "1.5rem"}}>
            {(appStateContext?.state.isChatHistoryOpen && appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) && <ChatHistoryPanel />}
            <div className="flex flex-col items-center flex-1 font-default dark:bg-chat-dark dark:text-default-txt-dark">
                <header className="flex justify-between items-center min-w-full gap-3 md:gap-6 py-3 px-1 md:px-5 dark:fill-default-txt-dark dark:text-default-txt-dark">
                    <div className="left flex justify-between items-center gap-2 md:gap-4">
                        {(appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) &&
                            (!appStateContext?.state.isChatHistoryOpen) &&
                            (
                            <IconButton
                                icon={<SidebarIcon />}
                                tooltip={{ content: 'Expand history', place: 'bottom-start' }}
                                onClick={handleHistoryClick}
                            />
                        )}
                        <Dropdown />
                    </div>
                    <div className="right flex flex-end gap-2">
                        <Button text="New Chat" type="primary" size="medium" 
                            onClick={newChat}
                        >
                            <CommentIcon />
                        </Button>
                    </div>
                </header>
                <Outlet />
                
                <Dialog
                    onDismiss={handleSharePanelDismiss}
                    hidden={!isSharePanelOpen}
                    styles={{

                        main: [{
                            selectors: {
                                ['@media (min-width: 480px)']: {
                                    maxWidth: '600px',
                                    background: "#FFFFFF",
                                    boxShadow: "0px 14px 28.8px rgba(0, 0, 0, 0.24), 0px 0px 8px rgba(0, 0, 0, 0.2)",
                                    borderRadius: "8px",
                                    maxHeight: '200px',
                                    minHeight: '100px',
                                }
                            }
                        }]
                    }}
                    dialogContentProps={{
                        title: "Share the web app",
                        showCloseButton: true
                    }}
                >
                    <Stack horizontal verticalAlign="center" style={{ gap: "8px" }}>
                        <TextField className={styles.urlTextBox} defaultValue={window.location.href} readOnly />
                        <div
                            className={styles.copyButtonContainer}
                            role="button"
                            tabIndex={0}
                            aria-label="Copy"
                            onClick={handleCopyClick}
                            onKeyDown={e => e.key === "Enter" || e.key === " " ? handleCopyClick() : null}
                        >
                            <CopyRegular className={styles.copyButton} />
                            <span className={styles.copyButtonText}>{copyText}</span>
                        </div>
                    </Stack>
                </Dialog>
            </div>
            {/* Citation Panel */}
            {appStateContext?.state.isCitaionOpen && appStateContext?.state.citationMessage && (
                    <div className="flex w-[422px] px-2 h-screen md:relative absolute md:z-0 z-10 py-2 px-2 bg-chat-default dark:bg-chat-dark border-r-interactive-secondary flex-col items-start gap-0 shrink-0 self-end">
                        <div className="space-y-3">
                            <div className="flex items-center gap-60">
                                <div className="text-base font-semibold font-impact">
                                    Citations
                                </div>
                                <div className="p-2">
                                    <IconButton
                                        icon={<Close />}
                                        tooltip={{ content: 'Expand history', place: 'bottom-start' }}
                                        onClick={closeCitation}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 mt-0" style={{
                                height: "85vh",
                                overflowY: "auto"
                            }}>
                                <h5 className="text-base font-semibold" tabIndex={0} title={appStateContext?.state.citationMessage.url && !appStateContext?.state.citationMessage.url.includes("blob.core") ? appStateContext?.state.citationMessage.url : appStateContext?.state.citationMessage.title ?? ""} onClick={() => onViewSource(appStateContext?.state.citationMessage)}>{appStateContext?.state.citationMessage.title}</h5>
                                <div tabIndex={0}>
                                    <ReactMarkdown
                                        linkTarget="_blank"
                                        className={styles.citationPanelContent}
                                        children={DOMPurify.sanitize(appStateContext?.state.citationMessage.content, { ALLOWED_TAGS: XSSAllowTags })}
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default Layout;
