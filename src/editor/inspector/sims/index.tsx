/**
 * Dedicated, game-styled editors for the communication nodes. Everything else
 * keeps the registry-driven generic fields.
 */
import type { ComponentType } from "react";
import type { NodeDoc, NodeType } from "@/schema/nodes";
import { CallEditor } from "./CallEditor";
import { KisscordEditor } from "./KisscordEditor";
import { MailSim } from "./MailSim";
import { WeeChatEditor } from "./WeeChatEditor";

type SimEditor = ComponentType<{ node: NodeDoc }>;

export const NODE_SIM_EDITORS: Partial<Record<NodeType, SimEditor>> = {
    "comms.kisscord": KisscordEditor as SimEditor,
    "comms.weechat": WeeChatEditor as SimEditor,
    "comms.mail": MailSim as SimEditor,
    "comms.call": CallEditor as SimEditor,
};
