/// <reference types="vite-plugin-svgr/client" />
import { useRef, useState, useEffect, useContext, useLayoutEffect } from "react";
import { CommandBarButton, IconButton, Dialog, DialogType, Stack } from "@fluentui/react";
import { SquareRegular, ShieldLockRegular, ErrorCircleRegular } from "@fluentui/react-icons";
import uuid from 'react-uuid';
import { isEmpty } from "lodash-es";
import LaunchChatAva from '../../assets/launch-chat-avatar.svg?react';
import styles from "./Chat.module.css";
import { ReactTyped } from 'react-typed';

import DearMayorLogo from '../../assets/dear-mayor-logo_big.svg?react';

import {
    ChatMessage,
    ConversationRequest,
    conversationApi,
    Citation,
    ToolMessageContent,
    ChatResponse,
    getUserInfo,
    Conversation,
    historyGenerate,
    historyUpdate,
    historyClear,
    ChatHistoryLoadingState,
    CosmosDBStatus,
    ErrorMessage,
    getBlobUrl
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";

const enum messageStatus {
    NotRunning = "Not Running",
    Processing = "Processing",
    Done = "Done"
}

const Chat = () => {
    const appStateContext = useContext(AppStateContext)
    const ui = appStateContext?.state.frontendSettings?.ui;
    const AUTH_ENABLED = false;
    const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
    const [activeCitation, setActiveCitation] = useState<Citation>();
    const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false);
    const abortFuncs = useRef([] as AbortController[]);
    const [showAuthMessage, setShowAuthMessage] = useState<boolean>(true);
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning);
    const [clearingChat, setClearingChat] = useState<boolean>(false);
    const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true);
    const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()


    const placeholderSentences = [
        'What Can I help you with?',
        'How can I assist you today?',
        'What questions do you have for me?',
        'Need help with something specific?',
        'What would you like to know?',
        'How can I make your day better?',
        'What information are you looking for?',
        'Is there anything you need assistance with?',
        'What can I do for you today?',
        'Feel free to ask me anything!',
        'How can I help you achieve your goals?',
      ];

    const errorDialogContentProps = {
        type: DialogType.close,
        title: errorMsg?.title,
        closeButtonAriaLabel: 'Close',
        subText: errorMsg?.subtitle,
    };

    const modalProps = {
        titleAriaId: 'labelId',
        subtitleAriaId: 'subTextId',
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
    }

    const [ASSISTANT, TOOL, ERROR] = ["assistant", "tool", "error"]
    const NO_CONTENT_ERROR = "No content in messages object."

    useEffect(() => {
        if (appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.Working  
            && appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured
            && appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail 
            && hideErrorDialog) {
            let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`
            setErrorMsg({
                title: "Chat history is not enabled",
                subtitle: subtitle
            })
            toggleErrorDialog();
        }
    }, [appStateContext?.state.isCosmosDBAvailable]);

    const handleErrorDialogClose = () => {
        toggleErrorDialog()
        setTimeout(() => {
            setErrorMsg(null)
        }, 500);
    }

    useEffect(() => {
        setIsLoading(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading)
    }, [appStateContext?.state.chatHistoryLoadingState])

    const getUserInfoList = async () => {
        if (!AUTH_ENABLED) {
            setShowAuthMessage(false);
            return;
        }
        const userInfoList = await getUserInfo();
        if (userInfoList.length === 0 && (window.location.hostname !== "127.0.0.1")) {
            setShowAuthMessage(true);
        }
        else {
            setShowAuthMessage(false);
        }
    }

    let assistantMessage = {} as ChatMessage
    let toolMessage = {} as ChatMessage
    let assistantContent = ""

    const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
        if (resultMessage.role === ASSISTANT) {
            assistantContent += resultMessage.content
            assistantMessage = resultMessage
            assistantMessage.content = assistantContent

            if (resultMessage.context) {
                toolMessage = {
                    id: uuid(),
                    role: TOOL,
                    content: resultMessage.context,
                    date: new Date().toISOString(),
                }
            }
        }

        if (resultMessage.role === TOOL) toolMessage = resultMessage

        if (!conversationId) {
            isEmpty(toolMessage) ?
                setMessages([...messages, userMessage, assistantMessage]) :
                setMessages([...messages, userMessage, toolMessage, assistantMessage]);
        } else {
            isEmpty(toolMessage) ?
                setMessages([...messages, assistantMessage]) :
                setMessages([...messages, toolMessage, assistantMessage]);
        }
    }

    const makeApiRequestWithoutCosmosDB = async (question: string, conversationId?: string) => {
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content: question,
            date: new Date().toISOString(),
        };

        let conversation: Conversation | null | undefined;
        if (!conversationId) {
            conversation = {
                id: conversationId ?? uuid(),
                title: question,
                messages: [userMessage],
                date: new Date().toISOString(),
            }
        } else {
            conversation = appStateContext?.state?.currentChat
            if (!conversation) {
                console.error("Conversation not found.");
                setIsLoading(false);
                setShowLoadingMessage(false);
                abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                return;
            } else {
                conversation.messages.push(userMessage);
            }
        }

        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
        setMessages(conversation.messages)

        const request: ConversationRequest = {
            messages: [...conversation.messages.filter((answer) => answer.role !== ERROR)]
        };

        let result = {} as ChatResponse;
        try {
            const response = await conversationApi(request, abortController.signal);
            if (response?.body) {
                const reader = response.body.getReader();

                let runningText = "";
                while (true) {
                    setProcessMessages(messageStatus.Processing)
                    const { done, value } = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            if (obj !== "" && obj !== "{}") {
                                runningText += obj;
                                result = JSON.parse(runningText);
                                if (result.choices?.length > 0) {
                                    result.choices[0].messages.forEach((msg) => {
                                        msg.id = result.id;
                                        msg.date = new Date().toISOString();
                                    })
                                    if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                                        setShowLoadingMessage(false);
                                    }
                                    result.choices[0].messages.forEach((resultObj) => {
                                        processResultMessage(resultObj, userMessage, conversationId);
                                    })
                                }
                                else if (result.error) {
                                    throw Error(result.error);
                                }
                                runningText = "";
                            }
                        }
                        catch (e) {
                            if (!(e instanceof SyntaxError)) {
                                console.error(e);
                                throw e;
                            } else {
                                console.log("Incomplete message. Continuing...")
                            }
                        }
                    });
                }
                conversation.messages.push(toolMessage, assistantMessage)
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
                setMessages([...messages, toolMessage, assistantMessage]);
            }

        } catch (e) {
            if (!abortController.signal.aborted) {
                let errorMessage = "An error occurred. Please try again. If the problem persists, please contact the site administrator.";
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: ERROR,
                    content: errorMessage,
                    date: new Date().toISOString()
                }
                conversation.messages.push(errorChatMsg);
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
                setMessages([...messages, errorChatMsg]);
            } else {
                setMessages([...messages, userMessage])
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
            setProcessMessages(messageStatus.Done)
        }

        return abortController.abort();
    };

    const makeApiRequestWithCosmosDB = async (question: string, conversationId?: string) => {
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content: question,
            date: new Date().toISOString(),
        };

        //api call params set here (generate)
        let request: ConversationRequest;
        let conversation;
        if (conversationId) {
            conversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
            if (!conversation) {
                console.error("Conversation not found.");
                setIsLoading(false);
                setShowLoadingMessage(false);
                abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                return;
            } else {
                conversation.messages.push(userMessage);
                request = {
                    messages: [...conversation.messages.filter((answer) => answer.role !== ERROR)]
                };
            }
        } else {
            request = {
                messages: [userMessage].filter((answer) => answer.role !== ERROR)
            };
            setMessages(request.messages)
        }
        let result = {} as ChatResponse;
        try {
            const response = conversationId ? await historyGenerate(request, abortController.signal, conversationId) : await historyGenerate(request, abortController.signal);
            if (!response?.ok) {
                const responseJson = await response.json();
                var errorResponseMessage = responseJson.error === undefined ? "Please try again. If the problem persists, please contact the site administrator." : responseJson.error;
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: ERROR,
                    content: `There was an error generating a response. Chat history can't be saved at this time. ${errorResponseMessage}`,
                    date: new Date().toISOString()
                }
                let resultConversation;
                if (conversationId) {
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if (!resultConversation) {
                        console.error("Conversation not found.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(errorChatMsg);
                } else {
                    setMessages([...messages, userMessage, errorChatMsg])
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...resultConversation.messages]);
                return;
            }
            if (response?.body) {
                const reader = response.body.getReader();

                let runningText = "";
                while (true) {
                    setProcessMessages(messageStatus.Processing)
                    const { done, value } = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            if (obj !== "" && obj !== "{}") {
                                runningText += obj;
                                result = JSON.parse(runningText);
                                if (!result.choices?.[0]?.messages?.[0].content) {
                                    errorResponseMessage = NO_CONTENT_ERROR;
                                    throw Error();
                                }
                                if (result.choices?.length > 0) {
                                    result.choices[0].messages.forEach((msg) => {
                                        msg.id = result.id;
                                        msg.date = new Date().toISOString();
                                    })
                                    if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                                        setShowLoadingMessage(false);
                                    }
                                    result.choices[0].messages.forEach((resultObj) => {
                                        processResultMessage(resultObj, userMessage, conversationId);
                                    })
                                }
                                runningText = "";
                            }
                            else if (result.error) {
                                throw Error(result.error);
                            }
                        }
                        catch (e) {
                            if (!(e instanceof SyntaxError)) {
                                console.error(e);
                                throw e;
                            } else {
                                console.log("Incomplete message. Continuing...")
                            }
                         }
                    });
                }

                let resultConversation;
                if (conversationId) {
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if (!resultConversation) {
                        console.error("Conversation not found.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    isEmpty(toolMessage) ?
                        resultConversation.messages.push(assistantMessage) :
                        resultConversation.messages.push(toolMessage, assistantMessage)
                } else {
                    resultConversation = {
                        id: result.history_metadata.conversation_id,
                        title: result.history_metadata.title,
                        messages: [userMessage],
                        date: result.history_metadata.date
                    }
                    isEmpty(toolMessage) ?
                        resultConversation.messages.push(assistantMessage) :
                        resultConversation.messages.push(toolMessage, assistantMessage)
                }
                if (!resultConversation) {
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                isEmpty(toolMessage) ?
                    setMessages([...messages, assistantMessage]) :
                    setMessages([...messages, toolMessage, assistantMessage]);

                /* Update Message Conversation */
                let reqMsg = messages;
                if (messages.length === 0) {
                    reqMsg = [userMessage, toolMessage, assistantMessage];
                }
                historyUpdate(reqMsg, result.history_metadata.conversation_id);
            }

        } catch (e) {
            if (!abortController.signal.aborted) {
                let errorMessage = `An error occurred. ${errorResponseMessage}`;
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: ERROR,
                    content: errorMessage,
                    date: new Date().toISOString()
                }
                let resultConversation;
                if (conversationId) {
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if (!resultConversation) {
                        console.error("Conversation not found.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(errorChatMsg);
                } else {
                    if (!result.history_metadata) {
                        console.error("Error retrieving data.", result);
                        let errorChatMsg: ChatMessage = {
                            id: uuid(),
                            role: ERROR,
                            content: errorMessage,
                            date: new Date().toISOString()
                        } 
                        setMessages([...messages, userMessage, errorChatMsg])
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation = {
                        id: result.history_metadata.conversation_id,
                        title: result.history_metadata.title,
                        messages: [userMessage],
                        date: result.history_metadata.date
                    }
                    resultConversation.messages.push(errorChatMsg);
                }
                if (!resultConversation) {
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...messages, errorChatMsg]);
            } else {
                setMessages([...messages, userMessage])
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
            setProcessMessages(messageStatus.Done)
        }
        return abortController.abort();

    }

    const clearChat = async () => {
        setClearingChat(true)
        if (appStateContext?.state.currentChat?.id && appStateContext?.state.isCosmosDBAvailable.cosmosDB) {
            let response = await historyClear(appStateContext?.state.currentChat.id)
            if (!response.ok) {
                setErrorMsg({
                    title: "Error clearing current chat",
                    subtitle: "Please try again. If the problem persists, please contact the site administrator.",
                })
                toggleErrorDialog();
            } else {
                appStateContext?.dispatch({ type: 'DELETE_CURRENT_CHAT_MESSAGES', payload: appStateContext?.state.currentChat.id });
                appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext?.state.currentChat });
                appStateContext?.dispatch({ type: 'SET_CITATION_MESSAGE', payload: undefined });
                appStateContext?.dispatch({ type: 'TOGGLE_CITATION', payload: false })
                setActiveCitation(undefined);
                setIsCitationPanelOpen(false);
                setMessages([])
            }
        }
        setClearingChat(false)
    };

    const newChat = () => {
        setProcessMessages(messageStatus.Processing)
        setMessages([])
        setIsCitationPanelOpen(false);
        setActiveCitation(undefined);
        appStateContext?.dispatch({ type: 'SET_CITATION_MESSAGE', payload: undefined });
        appStateContext?.dispatch({ type: 'TOGGLE_CITATION', payload: false })
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null });
        setProcessMessages(messageStatus.Done)
    };

    const stopGenerating = () => {
        abortFuncs.current.forEach(a => a.abort());
        setShowLoadingMessage(false);
        setIsLoading(false);
    }

    useEffect(() => {
        if (appStateContext?.state.currentChat) {
            setMessages(appStateContext.state.currentChat.messages)
        } else {
            setMessages([])
        }
    }, [appStateContext?.state.currentChat]);

    useLayoutEffect(() => {
        const saveToDB = async (messages: ChatMessage[], id: string) => {
            const response = await historyUpdate(messages, id)
            return response
        }

        if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
            if (appStateContext.state.isCosmosDBAvailable.cosmosDB) {
                if (!appStateContext?.state.currentChat?.messages) {
                    console.error("Failure fetching current chat state.")
                    return
                }
                const noContentError = appStateContext.state.currentChat.messages.find(m => m.role === ERROR)
                
                if (noContentError && !noContentError.content.includes(NO_CONTENT_ERROR)) {
                    saveToDB(appStateContext.state.currentChat.messages, appStateContext.state.currentChat.id)
                        .then((res) => {
                            if (!res.ok) {
                                let errorMessage = "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator.";
                                let errorChatMsg: ChatMessage = {
                                    id: uuid(),
                                    role: ERROR,
                                    content: errorMessage,
                                    date: new Date().toISOString()
                                }
                                if (!appStateContext?.state.currentChat?.messages) {
                                    let err: Error = {
                                        ...new Error,
                                        message: "Failure fetching current chat state."
                                    }
                                    throw err
                                }
                                setMessages([...appStateContext?.state.currentChat?.messages, errorChatMsg])
                            }
                            return res as Response
                        })
                        .catch((err) => {
                            console.error("Error: ", err)
                            let errRes: Response = {
                                ...new Response,
                                ok: false,
                                status: 500,
                            }
                            return errRes;
                        })
                }
            } else {
            }
            appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext.state.currentChat });
            setMessages(appStateContext.state.currentChat.messages)
            setProcessMessages(messageStatus.NotRunning)
        }
    }, [processMessages]);

    useEffect(() => {
        if (AUTH_ENABLED !== undefined) getUserInfoList();
    }, [AUTH_ENABLED]);

    useLayoutEffect(() => {
        chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" })
    }, [showLoadingMessage, processMessages]);

    const onShowCitation = (citation: Citation) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(citation.content, 'text/html');
    
        // Get all img elements
        const imgElements = doc.querySelectorAll('img');
        const srcs = Array.from(imgElements).map(img => img.src);

        if (srcs.length) {
            srcs.forEach((path: string, index: number) => {
                const paths = path.split('/');
                const src = paths[paths.length - 1];
                getBlobUrl(src).then((res: any) => {
                    imgElements[index]['src'] = res.sas_url;
                    const citationContent = new XMLSerializer().serializeToString(doc);
                    citation.content = citationContent;
                    if (imgElements.length == index + 1) {
                        appStateContext?.dispatch({ type: 'SET_CITATION_MESSAGE', payload: citation });
                        setActiveCitation(citation);
                    }
                })
            })
        } else {
            appStateContext?.dispatch({ type: 'SET_CITATION_MESSAGE', payload: citation });
            setActiveCitation(citation);
        }
        appStateContext?.dispatch({ type: 'TOGGLE_CITATION', payload: true })
        setIsCitationPanelOpen(true);
    };

    const parseCitationFromMessage = (message: ChatMessage) => {
        if (message?.role && message?.role === "tool") {
            try {
                const toolMessage = JSON.parse(message.content) as ToolMessageContent;
                return toolMessage.citations;
            }
            catch {
                return [];
            }
        }
        return [];
    }

    const disabledButton = () => {
        return isLoading || (messages && messages.length === 0) || clearingChat || appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading
    }

    return (
        // <div className={styles.container} role="main">
        <>
            {showAuthMessage ? (
                <Stack className={styles.chatEmptyState}>
                    <ShieldLockRegular className={styles.chatIcon} style={{ color: 'darkorange', height: "200px", width: "200px" }} />
                    <h1 className={styles.chatEmptyStateTitle}>Authentication Not Configured</h1>
                    <h2 className={styles.chatEmptyStateSubtitle}>
                        This app does not have authentication configured. Please add an identity provider by finding your app in the <a href="https://portal.azure.com/" target="_blank">Azure Portal</a> 
                        and following <a href="https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization" target="_blank">these instructions</a>.
                    </h2>
                    <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: "20px" }}><strong>Authentication configuration takes a few minutes to apply. </strong></h2>
                    <h2 className={styles.chatEmptyStateSubtitle} style={{ fontSize: "20px" }}><strong>If you deployed in the last 10 minutes, please wait and reload the page after 10 minutes.</strong></h2>
                </Stack>
            ) : (
                // <Stack horizontal className={styles.chatRoot}>
                <>
                    <div className="flex flex-col h-[calc(100dvh-150px)] max-h-full w-full overflow-y-auto md:h-[calc(100dvh-175px)]">
                        {!messages || messages.length < 1 ? (
                            <div className="flex flex-col justify-center items-center gap-2.5 w-full h-[calc(100%-20px)] md:h-[calc(100%-50px)]">
                                    <DearMayorLogo className="w-[300px] md:w-full fill-default-txt dark:fill-default-txt-dark " />
                                    <p className="font-bold text-xl">
                                        {
                                            <ReactTyped
                                                strings={placeholderSentences}
                                                typeSpeed={40}
                                                backSpeed={80}
                                                backDelay={2000}
                                                loop
                                            />
                                        }
                                    </p>
                            </div>
                            // <Stack className={styles.chatEmptyState}>
                            //     <img
                            //         src={ui?.chat_logo ? ui.chat_logo : Contoso}
                            //         className={styles.chatIcon}
                            //         aria-hidden="true"
                            //     />
                            //     {/* <h1 className={styles.chatEmptyStateTitle}>{ui?.chat_title}</h1> */}
                            //     <h2 className={styles.chatEmptyStateSubtitle}>{ui?.chat_description || "Start chatting with your RAG Apps."}</h2>
                            // </Stack>
                        ) : (
                            <div className="flex flex-col w-full pt-5 md:pt-12 px-5 lg:px-32 gap-5 md:gap-11 md:max-w-[720px] lg:max-w-[1024px] self-center">
                                {messages.map((answer, index) => (
                                    <>
                                        {answer.role === "user" ? (
                                            <div className="flex justify-end items-center gap-4 group-hover:opacity-100 group">
                                                <div className="md:min-w-[292px] md:max-w-[720px] rounded-3xl bg-default-bg-secondary dark:bg-chat-dark-inverse py-3 px-6">
                                                    {answer.content}
                                                </div>
                                            </div>
                                        ) : (
                                            answer.role === "assistant" ? <div className={styles.chatMessageGpt}>
                                                <Answer
                                                    answer={{
                                                        answer: answer.content,
                                                        citations: parseCitationFromMessage(messages[index - 1]),
                                                        message_id: answer.id,
                                                        feedback: answer.feedback
                                                    }}
                                                    onCitationClicked={c => onShowCitation(c)}
                                                    isLoading={isLoading}
                                                />
                                            </div> : answer.role === ERROR ? <div className={styles.chatMessageError}>
                                                <Stack horizontal className={styles.chatMessageErrorContent}>
                                                    <ErrorCircleRegular className={styles.errorIcon} style={{ color: "rgba(182, 52, 67, 1)" }} />
                                                    <span>Error</span>
                                                </Stack>
                                                <span className={styles.chatMessageErrorContent}>{answer.content}</span>
                                            </div> : null
                                        )}
                                    </>
                                ))}
                                {showLoadingMessage && (
                                    <>
                                        <div className="flex gap-4 min-w-[292px] max-w-[720px] rounded-3xl bg-transparent p-2 md:py-3 md:px-6">
                                            <div className="fill-black">
                                                <LaunchChatAva />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <ReactTyped
                                                    strings={['Thinking...']}
                                                    typeSpeed={40}
                                                    backSpeed={80}
                                                    backDelay={2000}
                                                    loop
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div ref={chatMessageStreamEnd} />
                            </div>
                        )}
                    </div>
                    <QuestionInput
                                clearOnSend
                                placeholder="Type a new question..."
                                disabled={isLoading}
                                onSend={(question, id) => {
                                    appStateContext?.state.isCosmosDBAvailable?.cosmosDB ? makeApiRequestWithCosmosDB(question, id) : makeApiRequestWithoutCosmosDB(question, id)
                                }}
                                conversationId={appStateContext?.state.currentChat?.id ? appStateContext?.state.currentChat?.id : undefined}
                        />
                    </>
                // </Stack>
            )}
        </>
        // </div>
    );
};

export default Chat;
